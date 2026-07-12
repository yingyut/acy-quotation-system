'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitQuotation,
  approveQuotation,
  rejectQuotation,
  markSent,
  markAccepted,
  markWon,
  markLost,
  cancelQuotation,
} from '@/lib/actions/quotations';

export function QuotationActions({
  quotationId,
  status,
  canApprove,
  canManage,
  canCancel,
  customerEmail,
  docNumber,
}: {
  quotationId: string;
  status: string;
  canApprove: boolean;
  canManage: boolean;
  canCancel: boolean;
  customerEmail: string | null;
  docNumber: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      }
    });
  }

  const pdfLink =
    typeof window !== 'undefined' ? `${window.location.origin}/api/quotations/${quotationId}/pdf` : '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'DRAFT' && canManage && (
        <button className="btn-primary text-sm" disabled={pending} onClick={() => run(() => submitQuotation(quotationId))}>
          ส่งขออนุมัติ
        </button>
      )}
      {canApprove && (
        <>
          <button className="btn-primary text-sm" disabled={pending} onClick={() => run(() => approveQuotation(quotationId))}>
            อนุมัติ
          </button>
          <button
            className="btn-danger text-sm"
            disabled={pending}
            onClick={() => {
              const reason = window.prompt('เหตุผลที่ไม่อนุมัติ:');
              if (reason) run(() => rejectQuotation(quotationId, reason));
            }}
          >
            ไม่อนุมัติ
          </button>
        </>
      )}
      {status === 'APPROVED' && canManage && (
        <a
          className="btn-secondary text-sm"
          href={`mailto:${customerEmail ?? ''}?subject=${encodeURIComponent(`ใบเสนอราคา ${docNumber}`)}&body=${encodeURIComponent(
            `เรียนลูกค้า\n\nกรุณาดาวน์โหลดใบเสนอราคาที่ลิงก์ด้านล่าง\n${pdfLink}\n\nขอบคุณครับ/ค่ะ`,
          )}`}
          onClick={() => run(() => markSent(quotationId))}
        >
          ส่ง Email ลูกค้า
        </a>
      )}
      {(status === 'SENT' || status === 'VIEWED') && canManage && (
        <button className="btn-secondary text-sm" disabled={pending} onClick={() => run(() => markAccepted(quotationId))}>
          ลูกค้าตอบรับ
        </button>
      )}
      {['SENT', 'VIEWED', 'ACCEPTED'].includes(status) && canManage && (
        <button className="btn-secondary text-sm" disabled={pending} onClick={() => run(() => markWon(quotationId))}>
          ปิดงาน (ชนะ)
        </button>
      )}
      {!['WON', 'LOST', 'CANCELLED', 'DRAFT'].includes(status) && canManage && (
        <button
          className="btn-secondary text-sm"
          disabled={pending}
          onClick={() => {
            const reason = window.prompt('เหตุผลที่แพ้งาน:');
            if (reason) run(() => markLost(quotationId, reason));
          }}
        >
          ปิดงาน (แพ้)
        </button>
      )}
      {!['CANCELLED', 'WON'].includes(status) && canCancel && (
        <button
          className="btn-danger text-sm"
          disabled={pending}
          onClick={() => {
            const reason = window.prompt('เหตุผลที่ยกเลิกเอกสาร:');
            if (reason) run(() => cancelQuotation(quotationId, reason));
          }}
        >
          ยกเลิกเอกสาร
        </button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
