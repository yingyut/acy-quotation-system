import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { exportProducts } from '@/lib/excel/productExcel';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  const user = await assertPermission(PERMISSIONS.PRODUCT_IMPORT_EXPORT);
  const products = await prisma.product.findMany({ where: { deletedAt: null }, orderBy: { code: 'asc' } });
  const buffer = await exportProducts(products);

  await writeAuditLog({ userId: user.id, action: 'EXPORT_PDF', entityType: 'Product', entityId: 'ALL' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
