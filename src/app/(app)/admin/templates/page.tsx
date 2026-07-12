import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { updateTemplate, setDefaultTemplate } from '@/lib/actions/templates';

export default async function TemplateSettingsPage() {
  await requirePermission(PERMISSIONS.TEMPLATE_MANAGE);
  const templates = await prisma.documentTemplate.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">ตั้งค่า Template เอกสาร</h1>
        <p className="text-sm text-gray-500">
          ปรับแต่ง Logo สี Font ระยะขอบ และการแสดงผลคอลัมน์ต่างๆ โดยไม่ต้องแก้ไข Code
        </p>
      </div>

      {templates.map((t) => (
        <form key={t.id} action={updateTemplate.bind(null, t.id)} className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-gray-800">
                {t.name} {t.isDefault && <span className="badge bg-brand text-white">ค่าเริ่มต้น</span>}
              </h2>
              <p className="text-xs text-gray-500">{t.description}</p>
            </div>
            {!t.isDefault && (
              <button type="button" formAction={setDefaultTemplate.bind(null, t.id)} className="btn-secondary text-xs">
                ตั้งเป็นค่าเริ่มต้น
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">ตำแหน่ง Logo</label>
              <select name="logoPosition" defaultValue={t.logoPosition} className="input">
                <option value="LEFT">ซ้าย</option>
                <option value="CENTER">กลาง</option>
                <option value="RIGHT">ขวา</option>
              </select>
            </div>
            <div>
              <label className="label">สีหัวตาราง</label>
              <input type="color" name="headerColor" defaultValue={t.headerColor} className="h-9 w-full rounded border" />
            </div>
            <div>
              <label className="label">ขนาดตัวอักษร (pt)</label>
              <input type="number" name="fontSizeBase" defaultValue={t.fontSizeBase} min={8} max={14} className="input" />
            </div>
            <div>
              <label className="label">รูปสินค้า</label>
              <select name="productImageMode" defaultValue={t.productImageMode} className="input">
                <option value="NONE">ไม่แสดง</option>
                <option value="SMALL">ขนาดเล็ก</option>
                <option value="MEDIUM">ขนาดกลาง</option>
                <option value="FULL">เต็มขนาด</option>
              </select>
            </div>
            <div>
              <label className="label">ระยะขอบบน (mm)</label>
              <input type="number" name="marginTopMm" defaultValue={t.marginTopMm} className="input" />
            </div>
            <div>
              <label className="label">ระยะขอบล่าง (mm)</label>
              <input type="number" name="marginBottomMm" defaultValue={t.marginBottomMm} className="input" />
            </div>
            <div>
              <label className="label">ระยะขอบซ้าย (mm)</label>
              <input type="number" name="marginLeftMm" defaultValue={t.marginLeftMm} className="input" />
            </div>
            <div>
              <label className="label">ระยะขอบขวา (mm)</label>
              <input type="number" name="marginRightMm" defaultValue={t.marginRightMm} className="input" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="checkbox" name="showProductCode" defaultChecked={t.showProductCode} /> แสดงรหัสสินค้า
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" name="showUnitPrice" defaultChecked={t.showUnitPrice} /> แสดงราคาต่อหน่วย
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" name="showDiscountColumn" defaultChecked={t.showDiscountColumn} /> แสดงคอลัมน์ส่วนลด
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" name="showDatasheetAppendix" defaultChecked={t.showDatasheetAppendix} /> แนบ Datasheet ท้ายเอกสาร
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" name="showPageNumber" defaultChecked={t.showPageNumber} /> แสดงเลขหน้า
            </label>
          </div>

          <div>
            <label className="label">Footer เฉพาะ Template นี้ (เว้นว่างเพื่อใช้ Footer ของบริษัท)</label>
            <input name="footerText" defaultValue={t.footerText ?? ''} className="input" />
          </div>

          <button type="submit" className="btn-secondary text-sm">
            บันทึก
          </button>
        </form>
      ))}
    </div>
  );
}
