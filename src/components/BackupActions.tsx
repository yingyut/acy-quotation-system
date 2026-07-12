'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { triggerManualBackup, restoreFromBackup } from '@/lib/actions/backup';

export function TriggerBackupButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setMessage(null);
    try {
      const result = await triggerManualBackup();
      setMessage(`สำรองข้อมูลสำเร็จ: ${result.fileName}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button className="btn-primary text-sm" disabled={pending} onClick={handleClick}>
        {pending ? 'กำลังสำรองข้อมูล...' : 'สำรองข้อมูลตอนนี้ (Backup Now)'}
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}

export function RestoreButton({ fileName }: { fileName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      `คำเตือน: การ Restore จากไฟล์ ${fileName} จะเขียนทับข้อมูลปัจจุบันทั้งหมด ต้องการดำเนินการต่อหรือไม่?`,
    );
    if (!confirmed) return;
    setPending(true);
    try {
      await restoreFromBackup(fileName);
      window.alert('Restore สำเร็จ กรุณา Restart ระบบ (docker compose restart app)');
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Restore ล้มเหลว');
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="text-xs text-red-600 hover:underline" disabled={pending} onClick={handleClick}>
      Restore
    </button>
  );
}
