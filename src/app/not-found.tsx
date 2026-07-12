import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <div className="text-5xl font-bold text-brand">404</div>
      <h1 className="text-lg font-semibold text-gray-800">ไม่พบหน้าที่คุณต้องการ</h1>
      <Link href="/dashboard" className="btn-primary mt-2">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
