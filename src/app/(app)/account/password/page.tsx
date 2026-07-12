import { requireUser } from '@/lib/rbac';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">เปลี่ยนรหัสผ่านของฉัน</h1>
      {user.mustChangePassword && (
        <div className="max-w-sm rounded bg-amber-50 p-2 text-sm text-amber-700">
          บัญชีนี้ใช้รหัสผ่านเริ่มต้น กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย
        </div>
      )}
      <ChangePasswordForm userId={user.id} />
    </div>
  );
}
