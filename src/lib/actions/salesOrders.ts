'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { generateDocNumber } from '@/lib/docNumber';

export async function createSalesOrderFromQuotation(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.SALES_ORDER_MANAGE);
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!['APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'WON'].includes(quotation.status)) {
    throw new Error('สร้างใบสั่งขายได้เฉพาะใบเสนอราคาที่อนุมัติแล้วเท่านั้น');
  }

  const docNumber = await generateDocNumber('SALES_ORDER');
  const created = await prisma.salesOrder.create({
    data: {
      docNumber,
      quotationId,
      items: {
        create: quotation.items
          .filter((i) => i.itemType !== 'HEADING')
          .map((i, idx) => ({
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            discountAmount: i.discountAmount,
            lineTotal: i.lineTotal,
          })),
      },
    },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'SalesOrder', entityId: created.id, newValue: { fromQuotation: quotationId } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath('/sales-orders');
  redirect(`/sales-orders/${created.id}`);
}

export async function cancelSalesOrder(id: string) {
  const user = await assertPermission(PERMISSIONS.SALES_ORDER_MANAGE);
  const updated = await prisma.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  await writeAuditLog({ userId: user.id, action: 'CANCEL', entityType: 'SalesOrder', entityId: id, newValue: { status: updated.status } });
  revalidatePath(`/sales-orders/${id}`);
}
