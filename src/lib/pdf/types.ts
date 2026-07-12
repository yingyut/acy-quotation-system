export interface PrintCompany {
  nameTh: string;
  nameEn: string;
  taxId: string;
  addressTh: string;
  phone: string | null;
  email: string | null;
  logoDataUri: string | null;
  stampDataUri: string | null;
  authorizedSignatureDataUri: string | null;
  preparedSignatureDataUri: string | null;
  standardTerms: string | null;
  footerText: string | null;
  primaryColor: string;
  bankAccounts: { bankName: string; accountName: string; accountNumber: string; branchName: string | null }[];
}

export interface PrintCustomer {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  isHeadOffice: boolean;
  branchName: string | null;
  branchCode: string | null;
  contactName: string | null;
}

export interface PrintLineItem {
  no: number | null; // null for TEXT/HEADING rows (no line number)
  itemType: 'PRODUCT' | 'SERVICE' | 'TEXT' | 'HEADING' | 'LUMP_SUM';
  code: string | null;
  name: string;
  description: string | null;
  imageDataUri: string | null;
  qty: number;
  unit: string | null;
  unitPrice: number;
  discountLabel: string | null; // e.g. "10%" or "100.00" - null if no discount
  lineTotal: number;
  hideUnitPrice: boolean;
}

export interface PrintTemplateConfig {
  logoPosition: string;
  headerColor: string;
  fontSizeBase: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  showProductCode: boolean;
  showUnitPrice: boolean;
  showDiscountColumn: boolean;
  productImageMode: 'NONE' | 'SMALL' | 'MEDIUM' | 'FULL';
  showPageNumber: boolean;
  isLumpSum: boolean;
}

export type CopyType = 'ORIGINAL' | 'COPY_CUSTOMER' | 'COPY_ACCOUNTING' | 'COPY_WAREHOUSE' | 'COPY_SALES';

export const COPY_LABELS: Record<CopyType, { th: string; en: string }> = {
  ORIGINAL: { th: 'ต้นฉบับ', en: 'ORIGINAL' },
  COPY_CUSTOMER: { th: 'สำเนาลูกค้า', en: 'COPY (CUSTOMER)' },
  COPY_ACCOUNTING: { th: 'สำเนาบัญชี', en: 'COPY (ACCOUNTING)' },
  COPY_WAREHOUSE: { th: 'สำเนาคลังสินค้า', en: 'COPY (WAREHOUSE)' },
  COPY_SALES: { th: 'สำเนาฝ่ายขาย', en: 'COPY (SALES)' },
};

export interface InvoicePrintData {
  docTitle: string;
  docType: string;
  docNumber: string;
  copyType: CopyType;
  issueDate: string;
  dueDate: string | null;
  company: PrintCompany;
  customer: PrintCustomer;
  items: PrintLineItem[];
  subtotal: number;
  totalDiscount: number;
  amountAfterDiscount: number;
  vatRate: number;
  vatAmount: number;
  whtRate: number;
  whtAmount: number;
  netTotal: number;
  amountInWordsTh: string;
  paidAmount: number;
  balanceAmount: number;
  quotationDocNumber: string | null;
  preparedByName: string;
  paymentInfo: { paidDate: string; method: string; refNumber: string | null } | null;
  template: PrintTemplateConfig;
}

export interface DeliveryNoteItem {
  no: number;
  code: string | null;
  name: string;
  description: string | null;
  qty: number;
  unit: string | null;
}

export interface DeliveryNotePrintData {
  docTitle: string;
  docNumber: string;
  copyType: CopyType;
  deliveryDate: string;
  salesOrderDocNumber: string;
  quotationDocNumber: string | null;
  company: PrintCompany;
  customer: PrintCustomer;
  items: DeliveryNoteItem[];
  note: string | null;
  receivedByName: string | null;
  preparedByName: string;
  template: PrintTemplateConfig;
}

export interface QuotationPrintData {
  docTitle: string; // e.g. "ใบเสนอราคา"
  docNumber: string;
  revisionNo: number;
  copyType: CopyType;
  quoteDate: string;
  validUntilDate: string;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  creditTermDays: number;
  projectName: string | null;
  title: string | null;
  company: PrintCompany;
  customer: PrintCustomer;
  items: PrintLineItem[];
  subtotal: number;
  totalDiscount: number;
  amountAfterDiscount: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmount: number;
  whtEnabled: boolean;
  whtRate: number;
  whtAmount: number;
  netTotal: number;
  amountInWordsTh: string;
  note: string | null;
  preparedByName: string;
  approvedByName: string | null;
  template: PrintTemplateConfig;
}
