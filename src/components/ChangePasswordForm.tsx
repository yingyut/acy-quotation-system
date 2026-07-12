'use client';

import { useState } from 'react';
import { changeOwnPassword } from '@/lib/actions/users';

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await changeOwnPassword(userId, formData);
      setMessage('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="card max-w-sm space-y-3">
      <div>
        <label className="label">รหัสผ่านปัจจุบัน</label>
        <input name="currentPassword" type="password" className="input" required />
      </div>
      <div>
        <label className="label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
        <input name="newPassword" type="password" className="input" required minLength={8} />
      </div>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
      </button>
    </form>
  );
}
