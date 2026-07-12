'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelInvoice } from '@/lib/actions/invoices';

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const reason = window.prompt('เหตุผลที่ยกเลิกเอกสาร:');
    if (!reason) return;
    setPending(true);
    await cancelInvoice(invoiceId, reason);
    setPending(false);
    router.refresh();
  }

  return (
    <button className="btn-danger text-sm" disabled={pending} onClick={handleClick}>
      ยกเลิกเอกสาร
    </button>
  );
}
