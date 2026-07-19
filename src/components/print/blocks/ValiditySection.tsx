import type { DocumentPrintData } from '@/lib/pdf/types';

export function ValiditySection({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showValidity) return null;
  if (!data.validUntilDate && !data.deliveryTerms && !data.paymentTerms) return null;
  return (
    <table className="doc-meta-stack" data-role="validity-section">
      <thead>
        <tr>
          <th>กำหนดยืนราคา</th>
          <th>ระยะเวลาส่งของ</th>
          <th>เงื่อนไขการชำระเงิน</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{data.validUntilDate || '-'}</td>
          <td>{data.deliveryTerms || '-'}</td>
          <td>{data.paymentTerms || '-'}</td>
        </tr>
      </tbody>
    </table>
  );
}
