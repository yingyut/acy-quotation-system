import { prisma } from '@/lib/prisma';
import { fileToDataUri } from '@/lib/storage';
import type { CopyType, DeliveryNotePrintData, PrintTemplateConfig } from '@/lib/pdf/types';

const DEFAULT_TEMPLATE: PrintTemplateConfig = {
  logoPosition: 'LEFT',
  headerColor: '#0F4C81',
  fontSizeBase: 10,
  marginTopMm: 15,
  marginRightMm: 12,
  marginBottomMm: 15,
  marginLeftMm: 12,
  showProductCode: true,
  showUnitPrice: false,
  showDiscountColumn: false,
  productImageMode: 'NONE',
  showPageNumber: true,
  isLumpSum: false,
};

function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function buildDeliveryNotePrintData(
  deliveryNoteId: string,
  copyType: CopyType,
): Promise<DeliveryNotePrintData> {
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

  return {
    docTitle: 'ใบส่งสินค้า',
    docNumber: deliveryNote.docNumber,
    copyType,
    deliveryDate: formatThaiDate(deliveryNote.deliveryDate),
    salesOrderDocNumber: deliveryNote.salesOrder.docNumber,
    quotationDocNumber: deliveryNote.salesOrder.quotation.docNumber,
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
    items: deliveryNote.items.map((item, idx) => ({
      no: idx + 1,
      code: item.code,
      name: item.name,
      description: item.description,
      qty: Number(item.qty),
      unit: item.unit,
    })),
    note: deliveryNote.note,
    receivedByName: deliveryNote.receivedByName,
    preparedByName: deliveryNote.salesOrder.quotation.preparedBy.fullName,
    template: DEFAULT_TEMPLATE,
  };
}
