import { prisma } from '@/lib/prisma';
import { fileToDataUri } from '@/lib/storage';
import { round2 } from '@/lib/money';
import { resolveTemplateConfig } from '@/lib/pdf/resolveTemplateConfig';
import type { CopyType, DocumentPrintData, PrintLineItem } from '@/lib/pdf/types';

const DOC_TITLES_TH: Record<string, string> = {
  INVOICE: 'ใบแจ้งหนี้',
  TAX_INVOICE: 'ใบแจ้งหนี้ / ใบกำกับภาษี',
  RECEIPT: 'ใบเสร็จรับเงิน',
  RECEIPT_TAX_INVOICE: 'ใบเสร็จรับเงิน / ใบกำกับภาษี',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
};

const DOC_TITLES_EN: Record<string, string> = {
  INVOICE: 'Invoice',
  TAX_INVOICE: 'Invoice / Tax Invoice',
  RECEIPT: 'Receipt',
  RECEIPT_TAX_INVOICE: 'Receipt / Tax Invoice',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
};

const PAYMENT_METHOD_TH: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
  CHEQUE: 'เช็ค',
  CREDIT_CARD: 'บัตรเครดิต',
  OTHER: 'อื่นๆ',
};

function formatThaiDate(date: Date | null): string {
  if (!date) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function buildInvoicePrintData(invoiceId: string, copyType: CopyType): Promise<DocumentPrintData> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      customer: true,
      createdBy: true,
      quotation: true,
      items: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidDate: 'desc' }, take: 1 },
      receipts: true,
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

  let no = 0;
  const items: PrintLineItem[] = invoice.items.map((item) => {
    no += 1;
    let discountLabel: string | null = null;
    const discountPercent = Number(item.discountPercent);
    const discountAmount = Number(item.discountAmount);
    if (discountPercent > 0) discountLabel = `${discountPercent}%`;
    else if (discountAmount > 0) discountLabel = discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });

    return {
      no,
      itemType: item.itemType,
      code: item.code,
      name: item.name,
      description: item.description,
      imageDataUri: null,
      qty: Number(item.qty),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      discountLabel,
      lineTotal: Number(item.lineTotal),
      hideUnitPrice: false,
    };
  });

  const lastPayment = invoice.payments[0];
  const isReceiptType = invoice.docType === 'RECEIPT' || invoice.docType === 'RECEIPT_TAX_INVOICE';

  const config = await resolveTemplateConfig(invoice.docType);

  return {
    docTypeKey: invoice.docType as DocumentPrintData['docTypeKey'],
    docTitleTh: DOC_TITLES_TH[invoice.docType] ?? invoice.docType,
    docTitleEn: DOC_TITLES_EN[invoice.docType] ?? invoice.docType,
    docNumber: invoice.docNumber,
    revisionNo: null,
    copyType,
    issueDateLabel: 'วันที่',
    issueDate: formatThaiDate(invoice.issueDate),
    dueDate: invoice.dueDate ? formatThaiDate(invoice.dueDate) : null,
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
      name: invoice.customer.name,
      address: invoice.customer.address,
      phone: invoice.customer.phone,
      email: invoice.customer.email,
      taxId: invoice.customer.taxId,
      isHeadOffice: invoice.customer.isHeadOffice,
      branchName: invoice.customer.branchName,
      branchCode: invoice.customer.branchCode,
      contactName: invoice.customer.contactName,
    },
    items,
    subtotal: round2(invoice.subtotal),
    totalDiscount: round2(invoice.totalDiscount),
    amountAfterDiscount: round2(invoice.amountAfterDiscount),
    vatEnabled: true,
    vatRate: Number(invoice.vatRate),
    vatAmount: round2(invoice.vatAmount),
    whtEnabled: Number(invoice.whtRate) > 0,
    whtRate: Number(invoice.whtRate),
    whtAmount: round2(invoice.whtAmount),
    netTotal: round2(invoice.netTotal),
    amountInWordsTh: invoice.amountInWordsTh ?? '',
    note: null,
    preparedByName: invoice.createdBy.fullName,
    approvedByName: null,
    paidAmount: round2(invoice.paidAmount),
    balanceAmount: round2(invoice.balanceAmount),
    quotationDocNumber: invoice.quotation?.docNumber ?? null,
    salesOrderDocNumber: null,
    receivedByName: null,
    paymentInfo:
      isReceiptType && lastPayment
        ? {
            paidDate: formatThaiDate(lastPayment.paidDate),
            method: PAYMENT_METHOD_TH[lastPayment.method] ?? lastPayment.method,
            refNumber: lastPayment.refNumber,
          }
        : null,
    config,
  };
}
