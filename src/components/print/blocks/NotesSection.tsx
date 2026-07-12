import type { DocumentPrintData } from '@/lib/pdf/types';

export function NotesSection({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showNotes) return null;
  const lines: string[] = [];
  if (data.paymentTerms) lines.push(`เงื่อนไขการชำระเงิน: ${data.paymentTerms}`);
  if (data.company.standardTerms) lines.push(data.company.standardTerms);
  if (data.note) lines.push(`หมายเหตุ: ${data.note}`);
  if (lines.length === 0) return null;
  return (
    <div className="terms-block" data-role="notes-section">
      <div className="terms-title">หมายเหตุ :</div>
      {lines.map((line, i) => (
        <div key={i}>
          {i + 1}. {line}
        </div>
      ))}
    </div>
  );
}
