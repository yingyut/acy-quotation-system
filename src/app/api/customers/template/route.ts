import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { buildCustomerTemplate } from '@/lib/excel/customerExcel';

export async function GET() {
  await assertPermission(PERMISSIONS.CUSTOMER_IMPORT_EXPORT);
  const buffer = await buildCustomerTemplate();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="customer-import-template.xlsx"',
    },
  });
}
