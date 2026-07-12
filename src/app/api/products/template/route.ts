import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildProductTemplate } from '@/lib/excel/productExcel';

export async function GET() {
  await assertPermission(PERMISSIONS.PRODUCT_IMPORT_EXPORT);
  const buffer = await buildProductTemplate();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-import-template.xlsx"',
    },
  });
}
