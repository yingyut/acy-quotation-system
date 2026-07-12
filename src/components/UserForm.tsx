import type { User, Role } from '@prisma/client';

export function UserForm({
  user,
  roles,
  action,
}: {
  user?: User;
  roles: Role[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="card space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">ชื่อผู้ใช้ (Username)</label>
          <input name="username" defaultValue={user?.username} className="input" required disabled={!!user} />
        </div>
        <div>
          <label className="label">ชื่อ-นามสกุล</label>
          <input name="fullName" defaultValue={user?.fullName} className="input" required />
        </div>
        <div>
          <label className="label">อีเมล</label>
          <input name="email" type="email" defaultValue={user?.email ?? ''} className="input" />
        </div>
        <div>
          <label className="label">สิทธิ์ (Role)</label>
          <select name="roleId" defaultValue={user?.roleId} className="input" required>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{user ? 'ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่านเริ่มต้น'}</label>
          <input name="password" type="password" className="input" required={!user} minLength={8} />
        </div>
        <div className="flex flex-col justify-center gap-2 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canViewCost" defaultChecked={user?.canViewCost} /> อนุญาตให้ดูราคาทุน (สำหรับ Sales)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} /> เปิดใช้งานบัญชี
          </label>
        </div>
      </div>
      <button type="submit" className="btn-primary">
        บันทึก
      </button>
    </form>
  );
}
