import type { DocumentTemplateConfig } from '@/lib/pdf/templateConfig';

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

export type CopyType = 'ORIGINAL' | 'COPY_CUSTOMER' | 'COPY_ACCOUNTING' | 'COPY_WAREHOUSE' | 'COPY_SALES';

export const COPY_LABELS: Record<CopyType, { th: string; en: string }> = {
  ORIGINAL: { th: 'ต้นฉบับ', en: 'ORIGINAL' },
  COPY_CUSTOMER: { th: 'สำเนาลูกค้า', en: 'COPY (CUSTOMER)' },
  COPY_ACCOUNTING: { th: 'สำเนาบัญชี', en: 'COPY (ACCOUNTING)' },
  COPY_WAREHOUSE: { th: 'สำเนาคลังสินค้า', en: 'COPY (WAREHOUSE)' },
  COPY_SALES: { th: 'สำเนาฝ่ายขาย', en: 'COPY (SALES)' },
};

/**
 * Unified print-data shape consumed by the shared block components and
 * DocumentRenderer (src/components/print/DocumentRenderer.tsx). One shape
 * for Quotation/Invoice/TaxInvoice/Receipt/DeliveryNote means the same
 * components render every document type - only field values and the
 * `config` differ, never the component tree.
 */
export interface DocumentPrintData {
  docTypeKey: 'QUOTATION' | 'INVOICE' | 'TAX_INVOICE' | 'RECEIPT' | 'RECEIPT_TAX_INVOICE' | 'DELIVERY_NOTE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  docTitleTh: string;
  docTitleEn: string;
  docNumber: string;
  revisionNo: number | null;
  copyType: CopyType;
  issueDateLabel: string;
  issueDate: string;
  dueDate: string | null;
  validUntilDate: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  creditTermDays: number | null;
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
  paidAmount: number | null;
  balanceAmount: number | null;
  quotationDocNumber: string | null;
  salesOrderDocNumber: string | null;
  receivedByName: string | null;
  paymentInfo: { paidDate: string; method: string; refNumber: string | null } | null;
  config: DocumentTemplateConfig;
}
