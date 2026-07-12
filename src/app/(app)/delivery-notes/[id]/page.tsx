import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { MarkDeliveredForm } from '@/components/MarkDeliveredForm';

export default async function DeliveryNoteDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.DELIVERY_NOTE_MANAGE);
  const note = await prisma.deliveryNote.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { salesOrder: { include: { quotation: { include: { customer: true } } } }, items: true },
  });
  if (!note) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ใบส่งสินค้า {note.docNumber}</h1>
        <span className="badge bg-blue-100 text-blue-700">{note.status}</span>
      </div>

      <div className="card text-sm">
        <p>ลูกค้า: {note.salesOrder.quotation.customer.name}</p>
        <p>วันที่: {note.deliveryDate.toLocaleDateString('th-TH')}</p>
        {note.receivedByName && <p>ผู้รับสินค้า: {note.receivedByName}</p>}
        <Link href={`/sales-orders/${note.salesOrderId}`} className="text-brand hover:underline">
          ดูใบสั่งขายต้นทาง
        </Link>
      </div>

      {note.status === 'PENDING' && <MarkDeliveredForm deliveryNoteId={note.id} />}

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>รายการ</th>
              <th className="text-right">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {note.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="text-right">
                  {Number(i.qty)} {i.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
