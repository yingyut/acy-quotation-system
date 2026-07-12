import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';

export default async function ReceiptsPage() {
  await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const receipts = await prisma.receipt.findMany({
    include: { invoice: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">ใบเสร็จรับเงิน</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ลูกค้า</th>
              <th>อ้างอิงใบแจ้งหนี้</th>
              <th className="text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  ยังไม่มีใบเสร็จรับเงิน — สร้างอัตโนมัติเมื่อบันทึกการรับชำระเงินในใบแจ้งหนี้
                </td>
              </tr>
            )}
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/receipts/${r.id}`} className="text-brand hover:underline">
                    {r.docNumber}
                  </Link>
                </td>
                <td>{r.receiptDate.toLocaleDateString('th-TH')}</td>
                <td>{r.invoice.customer.name}</td>
                <td>{r.invoice.docNumber}</td>
                <td className="text-right">{formatTHB(Number(r.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
