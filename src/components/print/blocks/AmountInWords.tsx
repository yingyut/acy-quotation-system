import type { DocumentPrintData } from '@/lib/pdf/types';

export function AmountInWords({ data }: { data: DocumentPrintData }) {
  if (!data.config.summary.showAmountWords) return null;
  return (
    <div className="amount-words-band" data-role="amount-words">
      <span className="label">จำนวนเงิน (ตัวอักษร)</span>
      <span className="value">{data.amountInWordsTh}</span>
    </div>
  );
}
