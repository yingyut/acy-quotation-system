import { requirePermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function DashboardPage() {
  const user = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  const showCost = canViewCost(user);
  const isViewerOnly = !user.permissions.includes(PERMISSIONS.QUOTATION_VIEW_ALL);

  const quotationScope = isViewerOnly ? { preparedById: user.id } : {};

  const [
    quotationsToday,
    quotationsThisMonth,
    wonCount,
    lostCount,
    pendingApprovalCount,
    overdueInvoices,
    quotationSumAgg,
  ] = await Promise.all([
    prisma.quotation.count({
      where: { ...quotationScope, isLatestRevision: true, createdAt: { gte: startOfToday() } },
    }),
    prisma.quotation.findMany({
      where: { ...quotationScope, isLatestRevision: true, createdAt: { gte: startOfMonth() } },
      select: { netTotal: true, status: true, totalProfit: true, gpPercent: true },
    }),
    prisma.quotation.count({ where: { ...quotationScope, status: 'WON' } }),
    prisma.quotation.count({ where: { ...quotationScope, status: 'LOST' } }),
    prisma.quotation.count({ where: { ...quotationScope, status: 'PENDING_APPROVAL' } }),
    prisma.invoice.findMany({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, dueDate: { lt: new Date() } },
      select: { balanceAmount: true },
    }),
    prisma.quotation.aggregate({
      where: { ...quotationScope, isLatestRevision: true },
      _sum: { netTotal: true },
    }),
  ]);

  const monthValue = quotationsThisMonth.reduce((sum, q) => sum + Number(q.netTotal), 0);
  const monthProfit = quotationsThisMonth.reduce((sum, q) => sum + Number(q.totalProfit), 0);
  const avgGp =
    quotationsThisMonth.length > 0
      ? quotationsThisMonth.reduce((sum, q) => sum + Number(q.gpPercent), 0) /
        quotationsThisMonth.length
      : 0;
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + Number(i.balanceAmount), 0);

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: 'ใบเสนอราคาวันนี้', value: String(quotationsToday) },
    { label: 'มูลค่าใบเสนอราคา (เดือนนี้)', value: `฿${formatTHB(monthValue)}` },
    { label: 'จำนวนงานที่ชนะ', value: String(wonCount) },
    { label: 'จำนวนงานที่แพ้', value: String(lostCount) },
    { label: 'อัตราปิดการขาย', value: `${winRate.toFixed(1)}%` },
    { label: 'เอกสารรออนุมัติ', value: String(pendingApprovalCount) },
    { label: 'ใบแจ้งหนี้ค้างชำระเกินกำหนด', value: `฿${formatTHB(overdueTotal)}` },
    {
      label: 'มูลค่าใบเสนอราคาทั้งหมด',
      value: `฿${formatTHB(Number(quotationSumAgg._sum.netTotal ?? 0))}`,
    },
  ];

  if (showCost) {
    stats.push(
      { label: 'กำไร (เดือนนี้)', value: `฿${formatTHB(monthProfit)}` },
      { label: 'GP เฉลี่ย (เดือนนี้)', value: `${avgGp.toFixed(1)}%` },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">ภาพรวมการขายและเอกสาร</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs font-medium text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-800">{s.value}</div>
          </div>
        ))}
      </div>

      {quotationsThisMonth.length === 0 && (
        <div className="card text-center text-sm text-gray-500">
          ยังไม่มีใบเสนอราคาในเดือนนี้ — เริ่มสร้างใบเสนอราคาแรกได้ที่เมนู{' '}
          <span className="font-medium text-brand">ใบเสนอราคา</span>
        </div>
      )}
    </div>
  );
}
