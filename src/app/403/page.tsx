import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <div className="text-5xl font-bold text-brand">403</div>
      <h1 className="text-lg font-semibold text-gray-800">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <p className="text-sm text-gray-500">
        กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่าควรมีสิทธิ์เข้าถึง
      </p>
      <Link href="/dashboard" className="btn-primary mt-2">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
