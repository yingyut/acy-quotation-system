import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import type { PermissionKey } from '@/lib/permissions';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Use in Server Components / pages. Redirects to /login when unauthenticated. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Use in Server Components / pages. Redirects to /403 when the permission is missing. */
export async function requirePermission(permission: PermissionKey) {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    redirect('/403');
  }
  return user;
}

export class PermissionError extends Error {
  constructor(permission: string) {
    super(`Missing permission: ${permission}`);
    this.name = 'PermissionError';
  }
}

/** Use in Server Actions / Route Handlers. Throws instead of redirecting. */
export async function assertPermission(permission: PermissionKey) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('UNAUTHENTICATED');
  if (!session.user.permissions.includes(permission)) {
    throw new PermissionError(permission);
  }
  return session.user;
}

export function hasPermission(
  user: { permissions: string[] } | null | undefined,
  permission: PermissionKey,
) {
  return !!user?.permissions.includes(permission);
}

/** Sales users can only see/edit cost figures when explicitly granted. */
export function canViewCost(user: { roleKey: string; canViewCost: boolean } | null | undefined) {
  if (!user) return false;
  if (user.roleKey === 'ADMIN' || user.roleKey === 'SALES_MANAGER') return true;
  return user.canViewCost;
}
