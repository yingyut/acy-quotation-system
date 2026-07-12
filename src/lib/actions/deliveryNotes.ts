'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { generateDocNumber } from '@/lib/docNumber';

export async function createDeliveryNoteFromSalesOrder(salesOrderId: string) {
  const user = await assertPermission(PERMISSIONS.DELIVERY_NOTE_MANAGE);
  const salesOrder = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: salesOrderId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (salesOrder.status === 'CANCELLED') throw new Error('ใบสั่งขายนี้ถูกยกเลิกแล้ว');

  const docNumber = await generateDocNumber('DELIVERY_NOTE');
  const created = await prisma.deliveryNote.create({
    data: {
      docNumber,
      salesOrderId,
      items: {
        create: salesOrder.items.map((i, idx) => ({
          sortOrder: idx,
          code: i.code,
          name: i.name,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
        })),
      },
    },
  });

  await prisma.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'DELIVERED' } });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'DeliveryNote', entityId: created.id, newValue: { fromSalesOrder: salesOrderId } });
  revalidatePath(`/sales-orders/${salesOrderId}`);
  revalidatePath('/delivery-notes');
  redirect(`/delivery-notes/${created.id}`);
}

export async function markDelivered(id: string, receivedByName: string) {
  const user = await assertPermission(PERMISSIONS.DELIVERY_NOTE_MANAGE);
  const updated = await prisma.deliveryNote.update({ where: { id }, data: { status: 'DELIVERED', receivedByName } });
  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'DeliveryNote', entityId: id, newValue: { status: updated.status } });
  revalidatePath(`/delivery-notes/${id}`);
}
