'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markDelivered } from '@/lib/actions/deliveryNotes';

export function MarkDeliveredForm({ deliveryNoteId }: { deliveryNoteId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setPending(true);
    await markDelivered(deliveryNoteId, name);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="card flex items-end gap-2">
      <div className="flex-1">
        <label className="label">ชื่อผู้รับสินค้า (ยืนยันการส่งมอบ)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <button className="btn-primary text-sm" disabled={pending} onClick={handleSubmit}>
        ยืนยันส่งมอบแล้ว
      </button>
    </div>
  );
}
