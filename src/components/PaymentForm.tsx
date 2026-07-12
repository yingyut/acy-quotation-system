'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordPayment } from '@/lib/actions/invoices';

export function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await recordPayment(invoiceId, formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="card space-y-3">
      <h2 className="font-medium text-gray-800">บันทึกการรับชำระเงิน (คงเหลือ {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท)</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">วันที่รับชำระ</label>
          <input type="date" name="paidDate" className="input" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div>
          <label className="label">จำนวนเงิน</label>
          <input type="number" step="0.01" name="amount" className="input" max={balance} required />
        </div>
        <div>
          <label className="label">วิธีชำระ</label>
          <select name="method" className="input">
            <option value="TRANSFER">โอนเงิน</option>
            <option value="CASH">เงินสด</option>
            <option value="CHEQUE">เช็ค</option>
            <option value="CREDIT_CARD">บัตรเครดิต</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </div>
        <div>
          <label className="label">เลขอ้างอิง / ธนาคาร</label>
          <input name="refNumber" className="input" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? 'กำลังบันทึก...' : 'บันทึกการรับชำระ'}
      </button>
    </form>
  );
}
