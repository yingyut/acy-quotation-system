import { notFound } from 'next/navigation';
import { requirePermission, hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { updateCustomer, softDeleteCustomer, addCustomerContact, deleteCustomerContact } from '@/lib/actions/customers';
import { CustomerForm } from '@/components/CustomerForm';
import { formatTHB } from '@/lib/money';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.CUSTOMER_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CUSTOMER_MANAGE);

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { contacts: true },
  });
  if (!customer) notFound();

  const quotations = await prisma.quotation.findMany({
    where: { customerId: customer.id, isLatestRevision: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const boundUpdate = updateCustomer.bind(null, customer.id);
  const boundAddContact = addCustomerContact.bind(null, customer.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{customer.name}</h1>
        {canManage && (
          <form action={softDeleteCustomer.bind(null, customer.id)}>
            <button className="btn-danger text-sm">ปิดใช้งานลูกค้า</button>
          </form>
        )}
      </div>

      {canManage ? (
        <CustomerForm customer={customer} action={boundUpdate} />
      ) : (
        <div className="card text-sm text-gray-600">
          <p>รหัส: {customer.code}</p>
          <p>เบอร์โทร: {customer.phone}</p>
          <p>อีเมล: {customer.email}</p>
          <p>ที่อยู่: {customer.address}</p>
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">ผู้ติดต่อ</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>ตำแหน่ง</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {customer.contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  ยังไม่มีผู้ติดต่อ
                </td>
              </tr>
            )}
            {customer.contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.position}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                {canManage && (
                  <td>
                    <form action={deleteCustomerContact.bind(null, customer.id, c.id)}>
                      <button className="text-xs text-red-600 hover:underline">ลบ</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canManage && (
          <form action={boundAddContact} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input name="name" placeholder="ชื่อ" className="input" required />
            <input name="position" placeholder="ตำแหน่ง" className="input" />
            <input name="phone" placeholder="เบอร์โทร" className="input" />
            <input name="email" placeholder="อีเมล" className="input" />
            <button className="btn-secondary col-span-2 sm:col-span-4">+ เพิ่มผู้ติดต่อ</button>
          </form>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-800">ประวัติใบเสนอราคา</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>สถานะ</th>
              <th className="text-right">ยอดสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400">
                  ยังไม่มีใบเสนอราคา
                </td>
              </tr>
            )}
            {quotations.map((q) => (
              <tr key={q.id}>
                <td>
                  <a href={`/quotations/${q.id}`} className="text-brand hover:underline">
                    {q.docNumber} Rev.{q.revisionNo}
                  </a>
                </td>
                <td>{q.quoteDate.toLocaleDateString('th-TH')}</td>
                <td>{q.status}</td>
                <td className="text-right">{formatTHB(Number(q.netTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
