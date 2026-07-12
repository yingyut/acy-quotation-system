import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, hasPermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { formatTHB } from '@/lib/money';
import {
  duplicateQuotation,
  createRevision,
  deleteDraftQuotation,
} from '@/lib/actions/quotations';
import { createSalesOrderFromQuotation } from '@/lib/actions/salesOrders';
import { createInvoiceFromQuotation } from '@/lib/actions/invoices';
import { QuotationActions } from '@/components/QuotationActions';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ร่าง',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  SENT: 'ส่งลูกค้าแล้ว',
  VIEWED: 'ลูกค้าเปิดดูแล้ว',
  ACCEPTED: 'ลูกค้าตอบรับ',
  REJECTED: 'ถูกปฏิเสธ',
  EXPIRED: 'หมดอายุ',
  CANCELLED: 'ยกเลิก',
  WON: 'ชนะงาน',
  LOST: 'แพ้งาน',
};

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const showCost = canViewCost(user) && user.permissions.includes(PERMISSIONS.QUOTATION_VIEW_COST);

  const quotation = await prisma.quotation.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      customer: true,
      preparedBy: true,
      approvedBy: true,
      items: { orderBy: { sortOrder: 'asc' } },
      approvalLogs: { orderBy: { createdAt: 'desc' }, include: { requestedBy: true, actor: true } },
    },
  });
  if (!quotation) notFound();

  const canViewAll = hasPermission(user, PERMISSIONS.QUOTATION_VIEW_ALL);
  if (!canViewAll && quotation.preparedById !== user.id) notFound();

  const isOwner = quotation.preparedById === user.id;
  const canEditAll = hasPermission(user, PERMISSIONS.QUOTATION_EDIT_ALL);
  const canEditOwn = hasPermission(user, PERMISSIONS.QUOTATION_EDIT_OWN) && isOwner;
  const canEdit = (canEditAll || canEditOwn) && ['DRAFT', 'PENDING_APPROVAL'].includes(quotation.status);
  const canApprove = hasPermission(user, PERMISSIONS.QUOTATION_APPROVE) && quotation.status === 'PENDING_APPROVAL';

  const invoices = await prisma.invoice.findMany({ where: { quotationId: quotation.id } });
  const salesOrders = await prisma.salesOrder.findMany({ where: { quotationId: quotation.id } });
  const canManageSalesOrder = hasPermission(user, PERMISSIONS.SALES_ORDER_MANAGE);
  const canManageInvoice = hasPermission(user, PERMISSIONS.INVOICE_MANAGE);
  const canConvert = ['APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'WON'].includes(quotation.status);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {quotation.docNumber} {quotation.revisionNo > 0 ? `Rev.${quotation.revisionNo}` : ''}
          </h1>
          <p className="text-sm text-gray-500">
            {quotation.customer.name} — {quotation.projectName}
          </p>
        </div>
        <span className="badge bg-blue-100 text-blue-700">{STATUS_LABELS[quotation.status]}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link href={`/quotations/${quotation.id}/edit`} className="btn-secondary text-sm">
            แก้ไข
          </Link>
        )}
        <a href={`/print/quotation/${quotation.id}?copy=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
          Preview PDF
        </a>
        <a href={`/api/quotations/${quotation.id}/pdf?copies=ORIGINAL`} target="_blank" className="btn-secondary text-sm">
          Export PDF
        </a>
        <a
          href={`/api/quotations/${quotation.id}/pdf?copies=ORIGINAL,COPY_ACCOUNTING`}
          target="_blank"
          className="btn-secondary text-sm"
        >
          พิมพ์ต้นฉบับ+สำเนา
        </a>
        {quotation.status === 'DRAFT' && (
          <form action={deleteDraftQuotation.bind(null, quotation.id)}>
            <button className="btn-danger text-sm">ลบ (Draft)</button>
          </form>
        )}
        <form action={duplicateQuotation.bind(null, quotation.id)}>
          <button className="btn-secondary text-sm">Duplicate</button>
        </form>
        {quotation.isLatestRevision && quotation.status !== 'DRAFT' && (
          <form action={createRevision.bind(null, quotation.id)}>
            <button className="btn-secondary text-sm">สร้าง Revision ใหม่</button>
          </form>
        )}
        {canManageSalesOrder && canConvert && salesOrders.length === 0 && (
          <form action={createSalesOrderFromQuotation.bind(null, quotation.id)}>
            <button className="btn-primary text-sm">แปลงเป็นใบสั่งขาย</button>
          </form>
        )}
        {canManageInvoice && canConvert && invoices.length === 0 && (
          <form action={createInvoiceFromQuotation.bind(null, quotation.id, 'INVOICE')}>
            <button className="btn-primary text-sm">แปลงเป็นใบแจ้งหนี้</button>
          </form>
        )}
      </div>

      <QuotationActions
        quotationId={quotation.id}
        status={quotation.status}
        canApprove={canApprove}
        canManage={canEditAll || isOwner}
        canCancel={hasPermission(user, PERMISSIONS.QUOTATION_CANCEL)}
        customerEmail={quotation.customer.email}
        docNumber={quotation.docNumber}
      />

      <div className="card space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <span className="text-gray-500">วันที่: </span>
            {quotation.quoteDate.toLocaleDateString('th-TH')}
          </div>
          <div>
            <span className="text-gray-500">ผู้จัดทำ: </span>
            {quotation.preparedBy.fullName}
          </div>
          <div>
            <span className="text-gray-500">ผู้อนุมัติ: </span>
            {quotation.approvedBy?.fullName ?? '-'}
          </div>
          <div>
            <span className="text-gray-500">ยืนราคา: </span>
            {quotation.validUntilDays} วัน
          </div>
          <div>
            <span className="text-gray-500">เครดิตเทอม: </span>
            {quotation.creditTermDays} วัน
          </div>
          <div>
            <span className="text-gray-500">Template: </span>
            {quotation.templateId ?? 'ค่าเริ่มต้น'}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รายการ</th>
              <th className="text-right">จำนวน</th>
              <th className="text-right">ราคา/หน่วย</th>
              {showCost && <th className="text-right">ต้นทุน/หน่วย</th>}
              <th className="text-right">รวมเงิน</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => (
              <tr key={item.id}>
                <td>{item.itemType === 'HEADING' || item.itemType === 'TEXT' ? '' : idx + 1}</td>
                <td>
                  <div className={item.itemType === 'HEADING' ? 'font-semibold' : ''}>{item.name}</div>
                  {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                </td>
                <td className="text-right">{item.itemType === 'TEXT' || item.itemType === 'HEADING' ? '' : `${item.qty} ${item.unit ?? ''}`}</td>
                <td className="text-right">{item.itemType === 'TEXT' || item.itemType === 'HEADING' ? '' : formatTHB(Number(item.unitPrice))}</td>
                {showCost && (
                  <td className="text-right">
                    {item.itemType === 'TEXT' || item.itemType === 'HEADING' ? '' : formatTHB(Number(item.unitCost))}
                  </td>
                )}
                <td className="text-right">{item.itemType === 'TEXT' || item.itemType === 'HEADING' ? '' : formatTHB(Number(item.lineTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card ml-auto max-w-sm space-y-1 text-sm">
        <div className="flex justify-between">
          <span>ยอดรวมก่อนส่วนลด</span>
          <span>{formatTHB(Number(quotation.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>ส่วนลดรวม</span>
          <span>{formatTHB(Number(quotation.totalDiscount))}</span>
        </div>
        <div className="flex justify-between">
          <span>มูลค่าหลังหักส่วนลด</span>
          <span>{formatTHB(Number(quotation.amountAfterDiscount))}</span>
        </div>
        {quotation.vatEnabled && (
          <div className="flex justify-between">
            <span>ภาษีมูลค่าเพิ่ม {Number(quotation.vatRate)}%</span>
            <span>{formatTHB(Number(quotation.vatAmount))}</span>
          </div>
        )}
        {quotation.whtEnabled && (
          <div className="flex justify-between">
            <span>หัก ณ ที่จ่าย {Number(quotation.whtRate)}%</span>
            <span>-{formatTHB(Number(quotation.whtAmount))}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-semibold">
          <span>ยอดสุทธิ</span>
          <span>{formatTHB(Number(quotation.netTotal))}</span>
        </div>
        {showCost && (
          <div className="mt-2 grid grid-cols-2 gap-1 rounded bg-gray-50 p-2 text-xs text-gray-600">
            <div>ต้นทุนรวม: {formatTHB(Number(quotation.totalCost))}</div>
            <div>กำไร: {formatTHB(Number(quotation.totalProfit))}</div>
            <div>GP%: {Number(quotation.gpPercent).toFixed(2)}%</div>
            <div>Markup%: {Number(quotation.markupPercent).toFixed(2)}%</div>
          </div>
        )}
      </div>

      {(invoices.length > 0 || salesOrders.length > 0) && (
        <div className="card space-y-2 text-sm">
          <h2 className="font-medium text-gray-800">เอกสารที่สร้างจากใบเสนอราคานี้</h2>
          {salesOrders.map((so) => (
            <div key={so.id}>
              <Link href={`/sales-orders/${so.id}`} className="text-brand hover:underline">
                ใบสั่งขาย {so.docNumber}
              </Link>
            </div>
          ))}
          {invoices.map((inv) => (
            <div key={inv.id}>
              <Link href={`/invoices/${inv.id}`} className="text-brand hover:underline">
                {inv.docType} {inv.docNumber}
              </Link>
            </div>
          ))}
        </div>
      )}

      {quotation.approvalLogs.length > 0 && (
        <div className="card space-y-2 text-sm">
          <h2 className="font-medium text-gray-800">ประวัติการอนุมัติ</h2>
          {quotation.approvalLogs.map((log) => (
            <div key={log.id} className="border-b border-gray-100 pb-1 text-xs">
              <span className="font-medium">{log.action}</span> โดย {log.actor?.fullName ?? log.requestedBy?.fullName}{' '}
              — {log.createdAt.toLocaleString('th-TH')}
              {log.reason && <div className="text-gray-500">เหตุผล: {log.reason}</div>}
            </div>
          ))}
        </div>
      )}

      {(quotation.lostReason || quotation.cancelReason) && (
        <div className="card text-sm text-red-600">
          {quotation.lostReason && <p>เหตุผลที่แพ้งาน: {quotation.lostReason}</p>}
          {quotation.cancelReason && <p>เหตุผลที่ยกเลิก: {quotation.cancelReason}</p>}
        </div>
      )}
    </div>
  );
}
