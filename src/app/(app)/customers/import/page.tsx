import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { ExcelImportClient } from '@/components/ExcelImportClient';

const COLUMNS = [
  { key: 'code', label: 'รหัส' },
  { key: 'name', label: 'ชื่อลูกค้า' },
  { key: 'taxId', label: 'เลขผู้เสียภาษี' },
  { key: 'phone', label: 'เบอร์โทร' },
];

export default async function CustomerImportPage() {
  await requirePermission(PERMISSIONS.CUSTOMER_IMPORT_EXPORT);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Import ลูกค้าจาก Excel</h1>
      <p className="text-sm text-gray-500">
        ดาวน์โหลด Template จากหน้ารายการลูกค้าก่อน กรอกข้อมูล แล้วอัปโหลดไฟล์เพื่อตรวจสอบก่อนนำเข้าจริง
      </p>
      <ExcelImportClient importUrl="/api/customers/import" listUrl="/customers" displayColumns={COLUMNS} />
    </div>
  );
}
