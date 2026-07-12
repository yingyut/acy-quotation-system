'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  permission?: PermissionKey;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'ภาพรวม',
    items: [{ href: '/dashboard', label: 'Dashboard', permission: PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    title: 'ข้อมูลหลัก',
    items: [
      { href: '/customers', label: 'ลูกค้า', permission: PERMISSIONS.CUSTOMER_VIEW },
      { href: '/products', label: 'สินค้าและบริการ', permission: PERMISSIONS.PRODUCT_VIEW },
    ],
  },
  {
    title: 'เอกสารขาย',
    items: [
      { href: '/quotations', label: 'ใบเสนอราคา', permission: PERMISSIONS.QUOTATION_VIEW_OWN },
      { href: '/sales-orders', label: 'ใบสั่งขาย', permission: PERMISSIONS.SALES_ORDER_MANAGE },
      { href: '/delivery-notes', label: 'ใบส่งสินค้า', permission: PERMISSIONS.DELIVERY_NOTE_MANAGE },
    ],
  },
  {
    title: 'เอกสารบัญชี',
    items: [
      { href: '/invoices', label: 'ใบแจ้งหนี้ / ใบกำกับภาษี', permission: PERMISSIONS.INVOICE_VIEW },
      { href: '/receipts', label: 'ใบเสร็จรับเงิน', permission: PERMISSIONS.INVOICE_VIEW },
    ],
  },
  {
    title: 'รายงาน',
    items: [{ href: '/reports', label: 'รายงาน', permission: PERMISSIONS.REPORT_VIEW }],
  },
  {
    title: 'ผู้ดูแลระบบ',
    items: [
      { href: '/admin/users', label: 'ผู้ใช้งานและสิทธิ์', permission: PERMISSIONS.USER_MANAGE },
      { href: '/admin/company', label: 'ตั้งค่าบริษัท', permission: PERMISSIONS.COMPANY_MANAGE },
      { href: '/admin/document-numbers', label: 'ตั้งค่าเลขที่เอกสาร', permission: PERMISSIONS.DOC_NUMBER_MANAGE },
      { href: '/admin/templates', label: 'ตั้งค่า Template', permission: PERMISSIONS.TEMPLATE_MANAGE },
      { href: '/admin/backup', label: 'Backup / Restore', permission: PERMISSIONS.BACKUP_MANAGE },
      { href: '/admin/audit-log', label: 'Audit Log', permission: PERMISSIONS.AUDIT_LOG_VIEW },
    ],
  },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          ACY
        </div>
        <span className="text-sm font-semibold text-gray-800">Quotation System</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter(
            (item) => !item.permission || permissions.includes(item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-4">
              <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-400">
                {section.title}
              </div>
              {items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'block rounded-md px-3 py-2 text-sm font-medium',
                      active ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
