import { requireUser } from '@/lib/rbac';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar permissions={user.permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar fullName={user.name ?? user.username} roleName={user.roleName} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
