import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { getSequenceConfigs, upsertSequenceConfig } from '@/lib/actions/documentSequences';

const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTATION: 'ใบเสนอราคา',
  SALES_ORDER: 'ใบสั่งขาย',
  DELIVERY_NOTE: 'ใบส่งสินค้า',
  INVOICE: 'ใบแจ้งหนี้',
  TAX_INVOICE: 'ใบกำกับภาษี',
  RECEIPT: 'ใบเสร็จรับเงิน',
  RECEIPT_TAX_INVOICE: 'ใบเสร็จรับเงิน/ใบกำกับภาษี',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
};

function exampleFor(c: Awaited<ReturnType<typeof getSequenceConfigs>>[number]): string {
  const now = new Date();
  const parts = [c.prefix];
  if (c.useYearBE) parts.push(String(now.getFullYear() + 543));
  else if (c.useYearCE) parts.push(String(now.getFullYear()));
  if (c.useMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
  if (c.useDay) parts.push(String(now.getDate()).padStart(2, '0'));
  parts.push('1'.padStart(c.runningDigits, '0'));
  return parts.join(c.separator);
}

export default async function DocumentNumberSettingsPage() {
  await requirePermission(PERMISSIONS.DOC_NUMBER_MANAGE);
  const configs = await getSequenceConfigs();

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">ตั้งค่าเลขที่เอกสาร</h1>
        <p className="text-sm text-gray-500">
          กำหนดรูปแบบเลขที่เอกสารแยกตามประเภท เลขที่ที่ออกแล้วจะไม่ถูกนำกลับมาใช้ซ้ำแม้เอกสารจะถูกยกเลิก
        </p>
      </div>

      {configs.map((c) => (
        <form key={c.docType} action={upsertSequenceConfig.bind(null, c.docType)} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-800">{DOC_TYPE_LABELS[c.docType]}</h2>
            <span className="text-xs text-gray-500">
              ตัวอย่าง: <span className="font-mono">{exampleFor(c)}</span> {c.lastDocNumber ? `(ล่าสุดที่ออก: ${c.lastDocNumber})` : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div>
              <label className="label">Prefix</label>
              <input name="prefix" defaultValue={c.prefix} className="input" required />
            </div>
            <div>
              <label className="label">ตัวคั่น</label>
              <input name="separator" defaultValue={c.separator} className="input" maxLength={2} />
            </div>
            <div>
              <label className="label">รูปแบบปี</label>
              <select name="yearFormat" defaultValue={c.useYearBE ? 'BE' : c.useYearCE ? 'CE' : 'NONE'} className="input">
                <option value="NONE">ไม่แสดงปี</option>
                <option value="CE">ค.ศ. (2026)</option>
                <option value="BE">พ.ศ. (2569)</option>
              </select>
            </div>
            <div>
              <label className="label">จำนวนหลัก Running</label>
              <input type="number" name="runningDigits" defaultValue={c.runningDigits} min={2} max={8} className="input" />
            </div>
            <div>
              <label className="label">เริ่มใหม่</label>
              <select name="resetPolicy" defaultValue={c.resetPolicy} className="input">
                <option value="NEVER">ไม่เริ่มใหม่</option>
                <option value="YEARLY">ทุกปี</option>
                <option value="MONTHLY">ทุกเดือน</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1 pb-2">
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="useMonth" defaultChecked={c.useMonth} /> แสดงเดือน
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="useDay" defaultChecked={c.useDay} /> แสดงวัน
              </label>
            </div>
          </div>
          <button type="submit" className="btn-secondary text-sm">
            บันทึก
          </button>
        </form>
      ))}
    </div>
  );
}
