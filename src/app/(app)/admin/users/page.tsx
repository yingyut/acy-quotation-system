import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { deactivateUser } from '@/lib/actions/users';

export default async function UsersPage() {
  await requirePermission(PERMISSIONS.USER_MANAGE);
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ผู้ใช้งานและสิทธิ์</h1>
        <Link href="/admin/users/new" className="btn-primary text-sm">
          + เพิ่มผู้ใช้
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>ชื่อผู้ใช้</th>
              <th>ชื่อ-นามสกุล</th>
              <th>สิทธิ์</th>
              <th>ดูราคาทุน</th>
              <th>เข้าสู่ระบบล่าสุด</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/users/${u.id}`} className="text-brand hover:underline">
                    {u.username}
                  </Link>
                </td>
                <td>{u.fullName}</td>
                <td>{u.role.name}</td>
                <td>{u.canViewCost || u.role.key === 'ADMIN' || u.role.key === 'SALES_MANAGER' ? 'ใช่' : '-'}</td>
                <td>{u.lastLoginAt ? u.lastLoginAt.toLocaleString('th-TH') : '-'}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td>
                  {u.isActive && (
                    <form action={deactivateUser.bind(null, u.id)}>
                      <button className="text-xs text-red-600 hover:underline">ปิดใช้งาน</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
