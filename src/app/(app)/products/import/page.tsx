import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { ExcelImportClient } from '@/components/ExcelImportClient';

const COLUMNS = [
  { key: 'code', label: 'รหัส' },
  { key: 'name', label: 'ชื่อสินค้า' },
  { key: 'sellPrice', label: 'ราคาขาย' },
];

export default async function ProductImportPage() {
  await requirePermission(PERMISSIONS.PRODUCT_IMPORT_EXPORT);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Import สินค้าจาก Excel</h1>
      <p className="text-sm text-gray-500">
        ดาวน์โหลด Template จากหน้ารายการสินค้าก่อน กรอกข้อมูล แล้วอัปโหลดไฟล์เพื่อตรวจสอบก่อนนำเข้าจริง
      </p>
      <ExcelImportClient importUrl="/api/products/import" listUrl="/products" displayColumns={COLUMNS} />
    </div>
  );
}
