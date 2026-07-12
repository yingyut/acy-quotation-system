import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'ยังไม่ชำระ',
  PARTIALLY_PAID: 'ชำระบางส่วน',
  PAID: 'ชำระครบแล้ว',
  OVERDUE: 'เกินกำหนดชำระ',
  CANCELLED: 'ยกเลิก',
};

export default async function InvoicesPage() {
  await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, docType: { in: ['INVOICE', 'TAX_INVOICE'] } },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">ใบแจ้งหนี้ / ใบกำกับภาษี</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ลูกค้า</th>
              <th>ครบกำหนด</th>
              <th className="text-right">ยอดสุทธิ</th>
              <th className="text-right">คงเหลือ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ยังไม่มีใบแจ้งหนี้
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const overdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.dueDate && inv.dueDate < now;
              return (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="text-brand hover:underline">
                      {inv.docNumber}
                    </Link>
                  </td>
                  <td>{inv.issueDate.toLocaleDateString('th-TH')}</td>
                  <td>{inv.customer.name}</td>
                  <td>{inv.dueDate?.toLocaleDateString('th-TH')}</td>
                  <td className="text-right">{formatTHB(Number(inv.netTotal))}</td>
                  <td className="text-right">{formatTHB(Number(inv.balanceAmount))}</td>
                  <td>
                    <span className={`badge ${overdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {overdue ? 'เกินกำหนดชำระ' : STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
