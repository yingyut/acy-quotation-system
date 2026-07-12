import { requirePermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';

export default async function ReportsPage() {
  const user = await requirePermission(PERMISSIONS.REPORT_VIEW);
  const showCost = canViewCost(user);

  const wonQuotations = await prisma.quotation.findMany({
    where: { status: 'WON', isLatestRevision: true },
    include: { preparedBy: true, customer: true },
  });

  const byEmployee = new Map<string, { name: string; total: number; count: number }>();
  const byCustomer = new Map<string, { name: string; total: number; count: number }>();
  const byMonth = new Map<string, number>();

  for (const q of wonQuotations) {
    const empKey = q.preparedBy.id;
    const emp = byEmployee.get(empKey) ?? { name: q.preparedBy.fullName, total: 0, count: 0 };
    emp.total += Number(q.netTotal);
    emp.count += 1;
    byEmployee.set(empKey, emp);

    const custKey = q.customerId;
    const cust = byCustomer.get(custKey) ?? { name: q.customer.name, total: 0, count: 0 };
    cust.total += Number(q.netTotal);
    cust.count += 1;
    byCustomer.set(custKey, cust);

    const monthKey = `${q.quoteDate.getFullYear()}-${String(q.quoteDate.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + Number(q.netTotal));
  }

  const topProductsRaw = await prisma.quotationItem.groupBy({
    by: ['name'],
    where: { itemType: 'PRODUCT', quotation: { status: 'WON', isLatestRevision: true } },
    _sum: { lineTotal: true, qty: true },
    orderBy: { _sum: { lineTotal: 'desc' } },
    take: 10,
  });

  const employeeRows = [...byEmployee.values()].sort((a, b) => b.total - a.total);
  const customerRows = [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  const monthRows = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">รายงาน</h1>
        <p className="text-sm text-gray-500">สรุปยอดขายจากใบเสนอราคาที่ปิดงานสำเร็จ (สถานะ &quot;ชนะงาน&quot;)</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-medium text-gray-800">ยอดขายแยกตามพนักงาน</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>พนักงาน</th>
                <th className="text-right">จำนวนงาน</th>
                <th className="text-right">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {employeeRows.map((e) => (
                <tr key={e.name}>
                  <td>{e.name}</td>
                  <td className="text-right">{e.count}</td>
                  <td className="text-right">{formatTHB(e.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-2 font-medium text-gray-800">ลูกค้าหลัก (Top 10)</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th className="text-right">จำนวนงาน</th>
                <th className="text-right">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {customerRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {customerRows.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="text-right">{c.count}</td>
                  <td className="text-right">{formatTHB(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-2 font-medium text-gray-800">สินค้าขายดี (Top 10)</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {topProductsRaw.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {topProductsRaw.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="text-right">{Number(p._sum.qty ?? 0)}</td>
                  <td className="text-right">{formatTHB(Number(p._sum.lineTotal ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-2 font-medium text-gray-800">ยอดขายแยกตามเดือน</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>เดือน</th>
                <th className="text-right">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-gray-400">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {monthRows.map(([month, total]) => (
                <tr key={month}>
                  <td>{month}</td>
                  <td className="text-right">{formatTHB(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!showCost && (
        <p className="text-xs text-gray-400">* ตัวเลขในหน้านี้เป็นยอดขาย (ราคาขาย) ไม่รวมข้อมูลต้นทุนหรือกำไร</p>
      )}
    </div>
  );
}
