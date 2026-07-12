import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createTemplate } from '@/lib/actions/templates';

const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTATION: 'ใบเสนอราคา',
  INVOICE: 'ใบแจ้งหนี้',
  TAX_INVOICE: 'ใบกำกับภาษี',
  RECEIPT: 'ใบเสร็จรับเงิน',
  DELIVERY_NOTE: 'ใบส่งสินค้า',
};

export default async function TemplateSettingsPage() {
  await requirePermission(PERMISSIONS.TEMPLATE_MANAGE);
  const templates = await prisma.documentTemplate.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">ตั้งค่า Template เอกสาร</h1>
          <p className="text-sm text-gray-500">
            ปรับแต่ง Layout, Logo, สี, Font, ระยะขอบ, คอลัมน์ตาราง และลายเซ็น ได้เองจากหน้านี้ โดยไม่ต้องแก้ไข Code
          </p>
        </div>
        <form action={createTemplate.bind(null, 'Template ใหม่', ['QUOTATION'])}>
          <button type="submit" className="btn-primary text-sm">
            + สร้าง Template ใหม่
          </button>
        </form>
      </div>

      <div className="card divide-y divide-gray-100 p-0">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800">{t.name}</span>
                {t.isDefault && <span className="badge bg-brand text-white">ค่าเริ่มต้น</span>}
              </div>
              <p className="text-xs text-gray-500">{t.description}</p>
              <p className="text-xs text-gray-400">
                {t.applicableDocTypes.map((d) => DOC_TYPE_LABELS[d] ?? d).join(', ') || 'ยังไม่ระบุประเภทเอกสาร'}
              </p>
            </div>
            <Link href={`/admin/templates/${t.id}/edit`} className="btn-secondary text-sm">
              แก้ไข
            </Link>
          </div>
        ))}
        {templates.length === 0 && <p className="p-4 text-sm text-gray-500">ยังไม่มี Template - กด "สร้าง Template ใหม่"</p>}
      </div>
    </div>
  );
}
