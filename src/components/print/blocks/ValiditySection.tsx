import type { DocumentPrintData } from '@/lib/pdf/types';

export function ValiditySection({ data }: { data: DocumentPrintData }) {
  if (!data.config.sections.showValidity) return null;
  if (!data.validUntilDate && !data.deliveryTerms && !data.paymentTerms) return null;
  return (
    <table className="doc-meta-table doc-meta-table-full" data-role="validity-section">
      <tbody>
        <tr>
          <td className="k">กำหนดยืนราคา</td>
          <td>{data.validUntilDate || '-'}</td>
          <td className="k">ระยะเวลาส่งของ</td>
          <td>{data.deliveryTerms || '-'}</td>
          <td className="k">เงื่อนไขการชำระเงิน</td>
          <td>{data.paymentTerms || '-'}</td>
        </tr>
      </tbody>
    </table>
  );
}
