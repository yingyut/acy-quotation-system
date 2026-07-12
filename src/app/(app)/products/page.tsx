import Link from 'next/link';
import { requirePermission, hasPermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';
import type { Prisma } from '@prisma/client';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.PRODUCT_MANAGE);
  const showCost = canViewCost(user) && hasPermission(user, PERMISSIONS.PRODUCT_VIEW_COST);
  const q = searchParams.q?.trim() ?? '';
  const status = searchParams.status ?? '';

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(status === 'ACTIVE' ? { isActive: true } : status === 'INACTIVE' ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { brand: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">สินค้าและบริการ</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {products.length} รายการ</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <a href="/api/products/template" className="btn-secondary text-sm">
                ดาวน์โหลด Template
              </a>
              <Link href="/products/import" className="btn-secondary text-sm">
                Import Excel
              </Link>
              <a href="/api/products/export" className="btn-secondary text-sm">
                Export Excel
              </a>
              <Link href="/products/new" className="btn-primary text-sm">
                + เพิ่มสินค้า
              </Link>
            </>
          )}
        </div>
      </div>

      <form className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">ค้นหา</label>
          <input name="q" defaultValue={q} placeholder="ชื่อ, รหัส, SKU, ยี่ห้อ" className="input w-64" />
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select name="status" defaultValue={status} className="input w-40">
            <option value="">ทั้งหมด</option>
            <option value="ACTIVE">ใช้งาน</option>
            <option value="INACTIVE">ปิดใช้งาน</option>
          </select>
        </div>
        <button className="btn-secondary">ค้นหา</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อสินค้า</th>
              <th>ยี่ห้อ / รุ่น</th>
              <th>หน่วย</th>
              <th className="text-right">ราคาขาย</th>
              {showCost && <th className="text-right">ราคาทุน</th>}
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={showCost ? 7 : 6} className="py-8 text-center text-gray-400">
                  ไม่พบข้อมูลสินค้า
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td>
                  <Link href={`/products/${p.id}`} className="text-brand hover:underline">
                    {p.code}
                  </Link>
                </td>
                <td>{p.name}</td>
                <td>
                  {p.brand} {p.model}
                </td>
                <td>{p.unit}</td>
                <td className="text-right">{formatTHB(Number(p.sellPrice))}</td>
                {showCost && <td className="text-right">{formatTHB(Number(p.costPrice))}</td>}
                <td>
                  <span
                    className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {p.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
