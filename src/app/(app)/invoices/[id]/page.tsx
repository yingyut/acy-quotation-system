import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission, hasPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';
import { PaymentForm } from '@/components/PaymentForm';
import { CancelInvoiceButton } from '@/components/CancelInvoiceButton';
import { createInvoiceFromQuotation } from '@/lib/actions/invoices';

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'ยังไม่ชำระ',
  PARTIALLY_PAID: 'ชำระบางส่วน',
  PAID: 'ชำระครบแล้ว',
  OVERDUE: 'เกินกำหนดชำระ',
  CANCELLED: 'ยกเลิก',
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.INVOICE_MANAGE);
  const canRecordPayment = hasPermission(user, PERMISSIONS.PAYMENT_RECORD);
  const canPrint = hasPermission(user, PERMISSIONS.INVOICE_PRINT);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      customer: true,
      items: true,
      payments: { orderBy: { paidDate: 'desc' } },
      receipts: true,
      quotation: true,
    },
  });
  if (!invoice) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {invoice.docType} {invoice.docNumber}
          </h1>
          <p className="text-sm text-gray-500">{invoice.customer.name}</p>
        </div>
        <span className="badge bg-blue-100 text-blue-700">{STATUS_LABELS[invoice.status]}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {canPrint && (
          <>
            <a href={`/print/invoice/${invoice.id}?copy=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
              Preview PDF
            </a>
            <a href={`/api/invoices/${invoice.id}/pdf?copies=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
              Export PDF (ต้นฉบับ)
            </a>
            <a
              href={`/api/invoices/${invoice.id}/pdf?copies=ORIGINAL,COPY_ACCOUNTING`}
              target="_blank"
              className="btn-secondary text-sm"
            >
              พิมพ์ต้นฉบับ+สำเนา
            </a>
          </>
        )}
        {canManage && invoice.docType === 'INVOICE' && (
          <form action={createInvoiceFromQuotation.bind(null, invoice.quotationId ?? '', 'TAX_INVOICE')}>
            <button className="btn-secondary text-sm" disabled={!invoice.quotationId}>
              ออกใบกำกับภาษี
            </button>
          </form>
        )}
        {canManage && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
          <CancelInvoiceButton invoiceId={invoice.id} />
        )}
      </div>

      <div className="card grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <span className="text-gray-500">วันที่: </span>
          {invoice.issueDate.toLocaleDateString('th-TH')}
        </div>
        <div>
          <span className="text-gray-500">ครบกำหนด: </span>
          {invoice.dueDate?.toLocaleDateString('th-TH')}
        </div>
        {invoice.quotation && (
          <div>
            <span className="text-gray-500">อ้างอิง: </span>
            <Link href={`/quotations/${invoice.quotation.id}`} className="text-brand hover:underline">
              {invoice.quotation.docNumber}
            </Link>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>รายการ</th>
              <th className="text-right">จำนวน</th>
              <th className="text-right">ราคา/หน่วย</th>
              <th className="text-right">รวมเงิน</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="text-right">
                  {Number(i.qty)} {i.unit}
                </td>
                <td className="text-right">{formatTHB(Number(i.unitPrice))}</td>
                <td className="text-right">{formatTHB(Number(i.lineTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card ml-auto max-w-sm space-y-1 text-sm">
        <div className="flex justify-between">
          <span>ยอดสุทธิ</span>
          <span className="font-semibold">{formatTHB(Number(invoice.netTotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>ชำระแล้ว</span>
          <span>{formatTHB(Number(invoice.paidAmount))}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
          <span>คงเหลือ</span>
          <span>{formatTHB(Number(invoice.balanceAmount))}</span>
        </div>
      </div>

      {canRecordPayment && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
        <PaymentForm invoiceId={invoice.id} balance={Number(invoice.balanceAmount)} />
      )}

      {invoice.payments.length > 0 && (
        <div className="card space-y-2 text-sm">
          <h2 className="font-medium text-gray-800">ประวัติการชำระเงิน</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>วิธีชำระ</th>
                <th>เลขอ้างอิง</th>
                <th className="text-right">จำนวนเงิน</th>
                <th>ใบเสร็จ</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => {
                const receipt = invoice.receipts.find((r) => r.paymentId === p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.paidDate.toLocaleDateString('th-TH')}</td>
                    <td>{p.method}</td>
                    <td>{p.refNumber}</td>
                    <td className="text-right">{formatTHB(Number(p.amount))}</td>
                    <td>
                      {receipt && (
                        <Link href={`/receipts/${receipt.id}`} className="text-brand hover:underline">
                          {receipt.docNumber}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
