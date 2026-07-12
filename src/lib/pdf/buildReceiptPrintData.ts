import { prisma } from '@/lib/prisma';
import { bahtText, round2 } from '@/lib/money';
import { buildInvoicePrintData } from '@/lib/pdf/buildInvoicePrintData';
import { resolveTemplateConfig } from '@/lib/pdf/resolveTemplateConfig';
import type { CopyType, DocumentPrintData } from '@/lib/pdf/types';

const PAYMENT_METHOD_TH: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
  CHEQUE: 'เช็ค',
  CREDIT_CARD: 'บัตรเครดิต',
  OTHER: 'อื่นๆ',
};

export async function buildReceiptPrintData(receiptId: string, copyType: CopyType): Promise<DocumentPrintData> {
  const receipt = await prisma.receipt.findUniqueOrThrow({
    where: { id: receiptId },
    include: { payment: true },
  });

  const base = await buildInvoicePrintData(receipt.invoiceId, copyType);
  const config = await resolveTemplateConfig('RECEIPT');

  return {
    ...base,
    docTypeKey: 'RECEIPT',
    docTitleTh: 'ใบเสร็จรับเงิน',
    docTitleEn: 'Receipt',
    docNumber: receipt.docNumber,
    netTotal: round2(receipt.amount),
    amountInWordsTh: bahtText(receipt.amount),
    paymentInfo: {
      paidDate: receipt.receiptDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      method: PAYMENT_METHOD_TH[receipt.payment.method] ?? receipt.payment.method,
      refNumber: receipt.payment.refNumber,
    },
    config,
  };
}
