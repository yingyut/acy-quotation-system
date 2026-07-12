import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMER_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CUSTOMER_MANAGE);
  const q = searchParams.q?.trim() ?? '';
  const status = searchParams.status ?? '';

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as 'ACTIVE' | 'INACTIVE' } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { taxId: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">ลูกค้า</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {customers.length} รายการ</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <a href="/api/customers/template" className="btn-secondary text-sm">
                ดาวน์โหลด Template
              </a>
              <Link href="/customers/import" className="btn-secondary text-sm">
                Import Excel
              </Link>
              <a href="/api/customers/export" className="btn-secondary text-sm">
                Export Excel
              </a>
              <Link href="/customers/new" className="btn-primary text-sm">
                + เพิ่มลูกค้า
              </Link>
            </>
          )}
        </div>
      </div>

      <form className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">ค้นหา</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="ชื่อ, รหัส, เลขผู้เสียภาษี, เบอร์โทร"
            className="input w-64"
          />
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select name="status" defaultValue={status} className="input w-40">
            <option value="">ทั้งหมด</option>
            <option value="ACTIVE">ใช้งาน</option>
            <option value="INACTIVE">ปิดใช้งาน</option>
          </select>
        </div>
        <button className="btn-secondary">ค้นหา</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อลูกค้า</th>
              <th>เบอร์โทร</th>
              <th>เลขผู้เสียภาษี</th>
              <th>เครดิตเทอม</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  ไม่พบข้อมูลลูกค้า
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td>
                  <Link href={`/customers/${c.id}`} className="text-brand hover:underline">
                    {c.code}
                  </Link>
                </td>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.taxId}</td>
                <td>{c.creditTermDays} วัน</td>
                <td>
                  <span
                    className={`badge ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {c.status === 'ACTIVE' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
