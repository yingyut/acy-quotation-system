'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <div className="text-5xl font-bold text-red-600">เกิดข้อผิดพลาด</div>
      <p className="max-w-md text-sm text-gray-600">
        ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หากยังพบปัญหากรุณาติดต่อผู้ดูแลระบบ
      </p>
      <button onClick={() => reset()} className="btn-primary mt-2">
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
