import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createCustomer } from '@/lib/actions/customers';
import { CustomerForm } from '@/components/CustomerForm';

export default async function NewCustomerPage() {
  await requirePermission(PERMISSIONS.CUSTOMER_MANAGE);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">เพิ่มลูกค้าใหม่</h1>
      <CustomerForm action={createCustomer} />
    </div>
  );
}
