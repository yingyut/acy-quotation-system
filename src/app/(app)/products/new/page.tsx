import { requirePermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createProduct } from '@/lib/actions/products';
import { ProductForm } from '@/components/ProductForm';

export default async function NewProductPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCT_MANAGE);
  const showCost = canViewCost(user);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">เพิ่มสินค้าใหม่</h1>
      <ProductForm action={createProduct} showCost={showCost} />
    </div>
  );
}
