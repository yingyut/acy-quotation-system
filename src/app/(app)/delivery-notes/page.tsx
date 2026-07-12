import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function DeliveryNotesPage() {
  await requirePermission(PERMISSIONS.DELIVERY_NOTE_MANAGE);
  const notes = await prisma.deliveryNote.findMany({
    where: { deletedAt: null },
    include: { salesOrder: { include: { quotation: { include: { customer: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">ใบส่งสินค้า</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ลูกค้า</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400">
                  ยังไม่มีใบส่งสินค้า
                </td>
              </tr>
            )}
            {notes.map((n) => (
              <tr key={n.id}>
                <td>
                  <Link href={`/delivery-notes/${n.id}`} className="text-brand hover:underline">
                    {n.docNumber}
                  </Link>
                </td>
                <td>{n.deliveryDate.toLocaleDateString('th-TH')}</td>
                <td>{n.salesOrder.quotation.customer.name}</td>
                <td>
                  <span className="badge bg-blue-100 text-blue-700">{n.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
