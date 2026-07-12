import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { invoice: { include: { customer: true } }, payment: true },
  });
  if (!receipt) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">ใบเสร็จรับเงิน {receipt.docNumber}</h1>

      <div className="flex flex-wrap gap-2">
        <a href={`/print/receipt/${receipt.id}?copy=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
          Preview PDF
        </a>
        <a href={`/api/receipts/${receipt.id}/pdf?copies=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
          Export PDF (ต้นฉบับ)
        </a>
        <a
          href={`/api/receipts/${receipt.id}/pdf?copies=ORIGINAL,COPY_ACCOUNTING`}
          target="_blank"
          className="btn-secondary text-sm"
        >
          พิมพ์ต้นฉบับ+สำเนา
        </a>
      </div>

      <div className="card space-y-1 text-sm">
        <p>ลูกค้า: {receipt.invoice.customer.name}</p>
        <p>วันที่รับชำระ: {receipt.receiptDate.toLocaleDateString('th-TH')}</p>
        <p>วิธีชำระ: {receipt.payment.method}</p>
        {receipt.payment.refNumber && <p>เลขอ้างอิง: {receipt.payment.refNumber}</p>}
        <p>
          อ้างอิงใบแจ้งหนี้:{' '}
          <Link href={`/invoices/${receipt.invoiceId}`} className="text-brand hover:underline">
            {receipt.invoice.docNumber}
          </Link>
        </p>
        <p className="pt-2 text-lg font-semibold">จำนวนเงิน {formatTHB(Number(receipt.amount))} บาท</p>
      </div>
    </div>
  );
}
