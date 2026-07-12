import { prisma } from '@/lib/prisma';
import { fileToDataUri } from '@/lib/storage';
import { resolveTemplateConfig } from '@/lib/pdf/resolveTemplateConfig';
import type { CopyType, DocumentPrintData, PrintLineItem } from '@/lib/pdf/types';

function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function buildDeliveryNotePrintData(
  deliveryNoteId: string,
  copyType: CopyType,
): Promise<DocumentPrintData> {
  const deliveryNote = await prisma.deliveryNote.findUniqueOrThrow({
    where: { id: deliveryNoteId },
    include: {
      salesOrder: { include: { quotation: { include: { customer: true, preparedBy: true } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  const company = await prisma.company.findFirst({ include: { bankAccounts: true } });
  if (!company) throw new Error('ยังไม่ได้ตั้งค่าข้อมูลบริษัท');

  const [logoDataUri, stampDataUri, authorizedSignatureDataUri, preparedSignatureDataUri] = await Promise.all([
    fileToDataUri(company.logoUrl),
    fileToDataUri(company.stampUrl),
    fileToDataUri(company.authorizedSignatureUrl),
    fileToDataUri(company.preparedSignatureUrl),
  ]);

  const customer = deliveryNote.salesOrder.quotation.customer;

  const items: PrintLineItem[] = deliveryNote.items.map((item, idx) => ({
    no: idx + 1,
    itemType: 'PRODUCT',
    code: item.code,
    name: item.name,
    description: item.description,
    imageDataUri: null,
    qty: Number(item.qty),
    unit: item.unit,
    unitPrice: 0,
    discountLabel: null,
    lineTotal: 0,
    hideUnitPrice: true,
  }));

  const config = await resolveTemplateConfig('DELIVERY_NOTE');

  return {
    docTypeKey: 'DELIVERY_NOTE',
    docTitleTh: 'ใบส่งสินค้า',
    docTitleEn: 'Delivery Note',
    docNumber: deliveryNote.docNumber,
    revisionNo: null,
    copyType,
    issueDateLabel: 'วันที่ส่งของ',
    issueDate: formatThaiDate(deliveryNote.deliveryDate),
    dueDate: null,
    validUntilDate: null,
    deliveryTerms: null,
    paymentTerms: null,
    creditTermDays: null,
    projectName: null,
    title: null,
    company: {
      nameTh: company.nameTh,
      nameEn: company.nameEn,
      taxId: company.taxId,
      addressTh: company.addressTh,
      phone: company.phone,
      email: company.email,
      logoDataUri,
      stampDataUri,
      authorizedSignatureDataUri,
      preparedSignatureDataUri,
      standardTerms: company.standardTerms,
      footerText: company.footerText,
      primaryColor: company.primaryColor,
      bankAccounts: company.bankAccounts.map((b) => ({
        bankName: b.bankName,
        accountName: b.accountName,
        accountNumber: b.accountNumber,
        branchName: b.branchName,
      })),
    },
    customer: {
      name: customer.name,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
      taxId: customer.taxId,
      isHeadOffice: customer.isHeadOffice,
      branchName: customer.branchName,
      branchCode: customer.branchCode,
      contactName: customer.contactName,
    },
    items,
    subtotal: 0,
    totalDiscount: 0,
    amountAfterDiscount: 0,
    vatEnabled: false,
    vatRate: 0,
    vatAmount: 0,
    whtEnabled: false,
    whtRate: 0,
    whtAmount: 0,
    netTotal: 0,
    amountInWordsTh: '',
    note: deliveryNote.note,
    preparedByName: deliveryNote.salesOrder.quotation.preparedBy.fullName,
    approvedByName: null,
    paidAmount: null,
    balanceAmount: null,
    quotationDocNumber: deliveryNote.salesOrder.quotation.docNumber,
    salesOrderDocNumber: deliveryNote.salesOrder.docNumber,
    receivedByName: deliveryNote.receivedByName,
    paymentInfo: null,
    config,
  };
}
