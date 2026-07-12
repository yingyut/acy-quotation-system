import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';
import { cancelSalesOrder } from '@/lib/actions/salesOrders';
import { createDeliveryNoteFromSalesOrder } from '@/lib/actions/deliveryNotes';
import { createInvoiceFromQuotation } from '@/lib/actions/invoices';

export default async function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.SALES_ORDER_MANAGE);
  const order = await prisma.salesOrder.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { quotation: { include: { customer: true } }, items: true, deliveryNotes: true, invoices: true },
  });
  if (!order) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ใบสั่งขาย {order.docNumber}</h1>
        <span className="badge bg-blue-100 text-blue-700">{order.status}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {order.status === 'OPEN' && order.deliveryNotes.length === 0 && (
          <form action={createDeliveryNoteFromSalesOrder.bind(null, order.id)}>
            <button className="btn-primary text-sm">สร้างใบส่งสินค้า</button>
          </form>
        )}
        {order.invoices.length === 0 && (
          <form action={createInvoiceFromQuotation.bind(null, order.quotationId, 'INVOICE')}>
            <button className="btn-primary text-sm">สร้างใบแจ้งหนี้</button>
          </form>
        )}
        {order.status === 'OPEN' && (
          <form action={cancelSalesOrder.bind(null, order.id)}>
            <button className="btn-danger text-sm">ยกเลิก</button>
          </form>
        )}
        <Link href={`/quotations/${order.quotationId}`} className="btn-secondary text-sm">
          ดูใบเสนอราคาต้นทาง
        </Link>
      </div>

      <div className="card text-sm">
        <p>ลูกค้า: {order.quotation.customer.name}</p>
        <p>วันที่: {order.orderDate.toLocaleDateString('th-TH')}</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>รายการ</th>
              <th className="text-right">จำนวน</th>
              <th className="text-right">ราคา/หน่วย</th>
              <th className="text-right">รวมเงิน</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="text-right">
                  {Number(i.qty)} {i.unit}
                </td>
                <td className="text-right">{formatTHB(Number(i.unitPrice))}</td>
                <td className="text-right">{formatTHB(Number(i.lineTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.deliveryNotes.length > 0 && (
        <div className="card space-y-1 text-sm">
          <h2 className="font-medium text-gray-800">ใบส่งสินค้า</h2>
          {order.deliveryNotes.map((d) => (
            <Link key={d.id} href={`/delivery-notes/${d.id}`} className="block text-brand hover:underline">
              {d.docNumber}
            </Link>
          ))}
        </div>
      )}
      {order.invoices.length > 0 && (
        <div className="card space-y-1 text-sm">
          <h2 className="font-medium text-gray-800">ใบแจ้งหนี้</h2>
          {order.invoices.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block text-brand hover:underline">
              {inv.docNumber}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
