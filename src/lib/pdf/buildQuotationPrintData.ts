import { prisma } from '@/lib/prisma';
import { fileToDataUri } from '@/lib/storage';
import { round2 } from '@/lib/money';
import type { CopyType, PrintTemplateConfig, QuotationPrintData, PrintLineItem } from '@/lib/pdf/types';

const DEFAULT_TEMPLATE: PrintTemplateConfig = {
  logoPosition: 'LEFT',
  headerColor: '#0F4C81',
  fontSizeBase: 10,
  marginTopMm: 15,
  marginRightMm: 12,
  marginBottomMm: 15,
  marginLeftMm: 12,
  showProductCode: true,
  showUnitPrice: true,
  showDiscountColumn: true,
  productImageMode: 'NONE',
  showPageNumber: true,
  isLumpSum: false,
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function buildQuotationPrintData(
  quotationId: string,
  copyType: CopyType,
): Promise<QuotationPrintData> {
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: {
      customer: true,
      preparedBy: true,
      approvedBy: true,
      template: true,
      items: { orderBy: { sortOrder: 'asc' }, include: { product: { include: { images: true } } } },
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

  let visibleLineNo = 0;
  const items: PrintLineItem[] = [];
  for (const item of quotation.items) {
    const isLineNumbered = item.itemType !== 'HEADING';
    if (isLineNumbered && item.itemType !== 'TEXT') visibleLineNo += 1;

    let imageDataUri: string | null = null;
    if (item.showImage) {
      const url = item.imageUrl ?? item.product?.images.find((i) => i.isPrimary)?.url ?? null;
      imageDataUri = await fileToDataUri(url);
    }

    let discountLabel: string | null = null;
    const discountPercent = Number(item.discountPercent);
    const discountAmount = Number(item.discountAmount);
    if (discountPercent > 0) discountLabel = `${discountPercent}%`;
    else if (discountAmount > 0) discountLabel = discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });

    items.push({
      no: item.itemType === 'HEADING' || item.itemType === 'TEXT' ? null : visibleLineNo,
      itemType: item.itemType,
      code: item.code,
      name: item.name,
      description: item.description,
      imageDataUri,
      qty: Number(item.qty),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      discountLabel,
      lineTotal: Number(item.lineTotal),
      hideUnitPrice: item.hideUnitPrice,
    });
  }

  const template: PrintTemplateConfig = quotation.template
    ? {
        logoPosition: quotation.template.logoPosition,
        headerColor: quotation.template.headerColor,
        fontSizeBase: quotation.template.fontSizeBase,
        marginTopMm: quotation.template.marginTopMm,
        marginRightMm: quotation.template.marginRightMm,
        marginBottomMm: quotation.template.marginBottomMm,
        marginLeftMm: quotation.template.marginLeftMm,
        showProductCode: quotation.template.showProductCode,
        showUnitPrice: quotation.template.showUnitPrice,
        showDiscountColumn: quotation.template.showDiscountColumn,
        productImageMode: quotation.template.productImageMode as PrintTemplateConfig['productImageMode'],
        showPageNumber: quotation.template.showPageNumber,
        isLumpSum: quotation.template.isLumpSum,
      }
    : DEFAULT_TEMPLATE;

  return {
    docTitle: 'ใบเสนอราคา',
    docNumber: quotation.docNumber,
    revisionNo: quotation.revisionNo,
    copyType,
    quoteDate: formatThaiDate(quotation.quoteDate),
    validUntilDate: formatThaiDate(addDays(quotation.quoteDate, quotation.validUntilDays)),
    deliveryTerms: quotation.deliveryTerms,
    paymentTerms: quotation.paymentTerms,
    creditTermDays: quotation.creditTermDays,
    projectName: quotation.projectName,
    title: quotation.title,
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
      name: quotation.customer.name,
      address: quotation.customer.address,
      phone: quotation.customer.phone,
      email: quotation.customer.email,
      taxId: quotation.customer.taxId,
      isHeadOffice: quotation.customer.isHeadOffice,
      branchName: quotation.customer.branchName,
      branchCode: quotation.customer.branchCode,
      contactName: quotation.contactName ?? quotation.customer.contactName,
    },
    items,
    subtotal: round2(quotation.subtotal),
    totalDiscount: round2(quotation.totalDiscount),
    amountAfterDiscount: round2(quotation.amountAfterDiscount),
    vatEnabled: quotation.vatEnabled,
    vatRate: Number(quotation.vatRate),
    vatAmount: round2(quotation.vatAmount),
    whtEnabled: quotation.whtEnabled,
    whtRate: Number(quotation.whtRate),
    whtAmount: round2(quotation.whtAmount),
    netTotal: round2(quotation.netTotal),
    amountInWordsTh: quotation.amountInWordsTh ?? '',
    note: quotation.note,
    preparedByName: quotation.preparedBy.fullName,
    approvedByName: quotation.approvedBy?.fullName ?? null,
    template,
  };
}
