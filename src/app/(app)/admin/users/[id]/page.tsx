import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { updateUser } from '@/lib/actions/users';
import { UserForm } from '@/components/UserForm';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.USER_MANAGE);
  const [user, roles] = await Promise.all([
    prisma.user.findFirst({ where: { id: params.id, deletedAt: null } }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!user) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">แก้ไขผู้ใช้: {user.fullName}</h1>
      <UserForm user={user} roles={roles} action={updateUser.bind(null, user.id)} />
    </div>
  );
}
