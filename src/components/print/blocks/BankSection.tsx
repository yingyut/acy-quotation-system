import type { DocumentPrintData } from '@/lib/pdf/types';

export function BankSection({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showBankSection) return null;
  if (data.company.bankAccounts.length === 0) return null;
  return (
    <div className="bank-block" data-role="bank-section">
      กรณีชำระเงิน โอนผ่านบัญชีธนาคาร{' '}
      {data.company.bankAccounts.map((b, i) => (
        <span key={i}>
          {i > 0 ? ' หรือ ' : ''}
          {b.bankName} เลขที่บัญชี {b.accountNumber} ชื่อบัญชี {b.accountName}
        </span>
      ))}
    </div>
  );
}
