import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function SalesOrdersPage() {
  await requirePermission(PERMISSIONS.SALES_ORDER_MANAGE);
  const orders = await prisma.salesOrder.findMany({
    where: { deletedAt: null },
    include: { quotation: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">ใบสั่งขาย</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ลูกค้า</th>
              <th>อ้างอิงใบเสนอราคา</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  ยังไม่มีใบสั่งขาย — สร้างได้จากหน้าใบเสนอราคาที่อนุมัติแล้ว
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/sales-orders/${o.id}`} className="text-brand hover:underline">
                    {o.docNumber}
                  </Link>
                </td>
                <td>{o.orderDate.toLocaleDateString('th-TH')}</td>
                <td>{o.quotation.customer.name}</td>
                <td>{o.quotation.docNumber}</td>
                <td>
                  <span className="badge bg-blue-100 text-blue-700">{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
