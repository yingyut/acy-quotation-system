import type { DocumentPrintData } from '@/lib/pdf/types';
import { money } from './format';

export function SummarySection({ data }: { data: DocumentPrintData }) {
  const cfg = data.config.summary;
  return (
    <table className="totals-table" style={{ width: `${cfg.widthMm}mm` }} data-role="summary-section">
      <tbody>
        {cfg.showSubtotal && (
          <tr>
            <td>รวมเงิน</td>
            <td className="align-right">{money(data.subtotal)}</td>
          </tr>
        )}
        {cfg.showDiscount && data.totalDiscount > 0 && (
          <tr>
            <td>ส่วนลด</td>
            <td className="align-right">{money(data.totalDiscount)}</td>
          </tr>
        )}
        <tr>
          <td>มูลค่าคงเหลือ</td>
          <td className="align-right">{money(data.amountAfterDiscount)}</td>
        </tr>
        {cfg.showVat && data.vatEnabled && (
          <tr>
            <td>ภาษีมูลค่าเพิ่ม {data.vatRate}%</td>
            <td className="align-right">{money(data.vatAmount)}</td>
          </tr>
        )}
        {cfg.showWht && data.whtEnabled && (
          <tr>
            <td>หัก ณ ที่จ่าย {data.whtRate}%</td>
            <td className="align-right">-{money(data.whtAmount)}</td>
          </tr>
        )}
        {cfg.showGrandTotal && (
          <tr className="grand-total">
            <td>
              ยอดเงินสุทธิ
              <br />
              GRAND TOTAL
            </td>
            <td className="align-right">{money(data.netTotal)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
