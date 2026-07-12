import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';
import type { Prisma, QuotationStatus } from '@prisma/client';
import { NewQuotationButton } from '@/components/NewQuotationButton';

const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'ร่าง',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  SENT: 'ส่งลูกค้าแล้ว',
  VIEWED: 'ลูกค้าเปิดดูแล้ว',
  ACCEPTED: 'ลูกค้าตอบรับ',
  REJECTED: 'ถูกปฏิเสธ',
  EXPIRED: 'หมดอายุ',
  CANCELLED: 'ยกเลิก',
  WON: 'ชนะงาน',
  LOST: 'แพ้งาน',
};

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  VIEWED: 'bg-indigo-100 text-indigo-700',
  ACCEPTED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-200 text-gray-500 line-through',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const user = await requirePermission(PERMISSIONS.QUOTATION_VIEW_OWN);
  const canViewAll = hasPermission(user, PERMISSIONS.QUOTATION_VIEW_ALL);
  const q = searchParams.q?.trim() ?? '';
  const status = searchParams.status ?? '';

  const where: Prisma.QuotationWhereInput = {
    isLatestRevision: true,
    deletedAt: null,
    ...(canViewAll ? {} : { preparedById: user.id }),
    ...(status ? { status: status as QuotationStatus } : {}),
    ...(q
      ? {
          OR: [
            { docNumber: { contains: q, mode: 'insensitive' } },
            { projectName: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const quotations = await prisma.quotation.findMany({
    where,
    include: { customer: true, preparedBy: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">ใบเสนอราคา</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {quotations.length} รายการ</p>
        </div>
        <NewQuotationButton />
      </div>

      <form className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">ค้นหา</label>
          <input name="q" defaultValue={q} placeholder="เลขที่, โครงการ, ลูกค้า" className="input w-64" />
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select name="status" defaultValue={status} className="input w-44">
            <option value="">ทั้งหมด</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">ค้นหา</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ลูกค้า</th>
              <th>โครงการ</th>
              <th>ผู้จัดทำ</th>
              <th className="text-right">ยอดสุทธิ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ยังไม่มีใบเสนอราคา — กด &quot;สร้างใบเสนอราคา&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            )}
            {quotations.map((q2) => (
              <tr key={q2.id} className="hover:bg-gray-50">
                <td>
                  <Link href={`/quotations/${q2.id}`} className="text-brand hover:underline">
                    {q2.docNumber} {q2.revisionNo > 0 ? `Rev.${q2.revisionNo}` : ''}
                  </Link>
                </td>
                <td>{q2.quoteDate.toLocaleDateString('th-TH')}</td>
                <td>{q2.customer.name}</td>
                <td>{q2.projectName}</td>
                <td>{q2.preparedBy.fullName}</td>
                <td className="text-right">{formatTHB(Number(q2.netTotal))}</td>
                <td>
                  <span className={`badge ${STATUS_COLORS[q2.status]}`}>{STATUS_LABELS[q2.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
