import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { exportCustomers } from '@/lib/excel/customerExcel';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_IMPORT_EXPORT);
  const customers = await prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { code: 'asc' } });
  const buffer = await exportCustomers(customers);

  await writeAuditLog({ userId: user.id, action: 'EXPORT_PDF', entityType: 'Customer', entityId: 'ALL' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
