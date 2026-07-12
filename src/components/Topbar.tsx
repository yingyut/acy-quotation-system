'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

export function Topbar({ fullName, roleName }: { fullName: string; roleName: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="text-sm text-gray-500 md:hidden">ACY Quotation</div>
      <div />
      <div className="flex items-center gap-3">
        <Link href="/account/password" className="text-right hover:opacity-75">
          <div className="text-sm font-medium text-gray-800">{fullName}</div>
          <div className="text-xs text-gray-500">{roleName}</div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn-secondary text-xs"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
