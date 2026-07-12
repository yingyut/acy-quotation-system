import { notFound } from 'next/navigation';
import { requirePermission, hasPermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import {
  updateProduct,
  deactivateProduct,
  duplicateProduct,
  addProductImage,
  deleteProductImage,
  setPrimaryProductImage,
  addProductSpec,
  deleteProductSpec,
  uploadProductDatasheet,
} from '@/lib/actions/products';
import { ProductForm } from '@/components/ProductForm';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.PRODUCT_MANAGE);
  const showCost = canViewCost(user) && hasPermission(user, PERMISSIONS.PRODUCT_VIEW_COST);

  const product = await prisma.product.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      specs: { orderBy: { sortOrder: 'asc' } },
      priceHistory: { orderBy: { changedAt: 'desc' }, take: 20 },
    },
  });
  if (!product) notFound();

  const attachments = await prisma.attachment.findMany({
    where: { entityType: 'Product', entityId: product.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{product.name}</h1>
        {canManage && (
          <div className="flex gap-2">
            <form action={duplicateProduct.bind(null, product.id)}>
              <button className="btn-secondary text-sm">Duplicate</button>
            </form>
            {product.isActive && (
              <form action={deactivateProduct.bind(null, product.id)}>
                <button className="btn-danger text-sm">ปิดใช้งาน</button>
              </form>
            )}
          </div>
        )}
      </div>

      {canManage ? (
        <ProductForm product={product} action={updateProduct.bind(null, product.id)} showCost={showCost} />
      ) : (
        <div className="card text-sm text-gray-600">
          <p>รหัส: {product.code}</p>
          <p>ยี่ห้อ/รุ่น: {product.brand} {product.model}</p>
          <p>รายละเอียด: {product.description}</p>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">รูปสินค้า</h2>
        <div className="flex flex-wrap gap-3">
          {product.images.map((img) => (
            <div key={img.id} className="relative w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-28 w-28 rounded border object-cover" />
              {img.isPrimary && (
                <span className="badge absolute left-1 top-1 bg-brand text-white">หลัก</span>
              )}
              {canManage && (
                <div className="mt-1 flex justify-between text-xs">
                  {!img.isPrimary && (
                    <form action={setPrimaryProductImage.bind(null, product.id, img.id)}>
                      <button className="text-brand hover:underline">ตั้งเป็นหลัก</button>
                    </form>
                  )}
                  <form action={deleteProductImage.bind(null, product.id, img.id)}>
                    <button className="text-red-600 hover:underline">ลบ</button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {product.images.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรูปสินค้า</p>}
        </div>
        {canManage && (
          <form action={addProductImage.bind(null, product.id)} className="flex items-center gap-2">
            <input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="text-sm" required />
            <button className="btn-secondary text-sm">+ เพิ่มรูป</button>
          </form>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">Bullet Specification</h2>
        <table className="table-base">
          <tbody>
            {product.specs.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.label}</td>
                <td>{s.value}</td>
                {canManage && (
                  <td>
                    <form action={deleteProductSpec.bind(null, product.id, s.id)}>
                      <button className="text-xs text-red-600 hover:underline">ลบ</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {product.specs.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-gray-400">
                  ยังไม่มี Spec
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {canManage && (
          <form action={addProductSpec.bind(null, product.id)} className="flex gap-2">
            <input name="label" placeholder="หัวข้อ เช่น CPU" className="input" required />
            <input name="value" placeholder="ค่า เช่น Intel i5" className="input" required />
            <button className="btn-secondary text-sm">+ เพิ่ม</button>
          </form>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">Datasheet / เอกสารแนบ</h2>
        <ul className="text-sm">
          {attachments.map((a) => (
            <li key={a.id}>
              <a href={`/api/files/${a.filePath}`} target="_blank" className="text-brand hover:underline">
                {a.fileName}
              </a>
            </li>
          ))}
          {attachments.length === 0 && <p className="text-gray-400">ยังไม่มีไฟล์แนบ</p>}
        </ul>
        {canManage && (
          <form action={uploadProductDatasheet.bind(null, product.id)} className="flex items-center gap-2">
            <input type="file" name="file" accept="application/pdf" className="text-sm" required />
            <button className="btn-secondary text-sm">+ อัปโหลด Datasheet</button>
          </form>
        )}
      </div>

      {showCost && product.priceHistory.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-medium text-gray-800">ประวัติการเปลี่ยนราคา</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายการ</th>
                <th>ค่าเดิม</th>
                <th>ค่าใหม่</th>
                <th>ผู้แก้ไข</th>
              </tr>
            </thead>
            <tbody>
              {product.priceHistory.map((h) => (
                <tr key={h.id}>
                  <td>{h.changedAt.toLocaleString('th-TH')}</td>
                  <td>{h.field}</td>
                  <td>{h.oldValue}</td>
                  <td>{h.newValue}</td>
                  <td>{h.changedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
