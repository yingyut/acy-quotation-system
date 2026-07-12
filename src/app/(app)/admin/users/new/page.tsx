import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createUser } from '@/lib/actions/users';
import { UserForm } from '@/components/UserForm';

export default async function NewUserPage() {
  await requirePermission(PERMISSIONS.USER_MANAGE);
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">เพิ่มผู้ใช้ใหม่</h1>
      <UserForm roles={roles} action={createUser} />
    </div>
  );
}
