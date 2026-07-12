'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { generateDocNumber } from '@/lib/docNumber';
import { bahtText, round2 } from '@/lib/money';
import type { InvoiceDocType, PaymentMethod } from '@prisma/client';

interface CreateInvoiceSource {
  quotationId?: string;
  salesOrderId?: string;
  deliveryNoteId?: string;
}

export async function createInvoiceFromQuotation(quotationId: string, docType: InvoiceDocType) {
  const user = await assertPermission(PERMISSIONS.INVOICE_MANAGE);
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { items: { orderBy: { sortOrder: 'asc' } }, customer: true },
  });

  return createInvoiceInternal(user.id, docType, quotation.customerId, { quotationId }, {
    subtotal: Number(quotation.subtotal),
    totalDiscount: Number(quotation.totalDiscount),
    amountAfterDiscount: Number(quotation.amountAfterDiscount),
    vatRate: Number(quotation.vatRate),
    vatAmount: Number(quotation.vatAmount),
    whtRate: Number(quotation.whtRate),
    whtAmount: Number(quotation.whtAmount),
    netTotal: Number(quotation.netTotal),
    creditTermDays: quotation.creditTermDays,
    items: quotation.items
      .filter((i) => i.itemType !== 'HEADING')
      .map((i) => ({
        itemType: i.itemType,
        code: i.code,
        name: i.name,
        description: i.description,
        qty: Number(i.qty),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent),
        discountAmount: Number(i.discountAmount),
        lineTotal: Number(i.lineTotal),
      })),
  });
}

async function createInvoiceInternal(
  userId: string,
  docType: InvoiceDocType,
  customerId: string,
  source: CreateInvoiceSource,
  totals: {
    subtotal: number;
    totalDiscount: number;
    amountAfterDiscount: number;
    vatRate: number;
    vatAmount: number;
    whtRate: number;
    whtAmount: number;
    netTotal: number;
    creditTermDays: number;
    items: {
      itemType: 'PRODUCT' | 'SERVICE' | 'TEXT' | 'HEADING' | 'LUMP_SUM';
      code: string | null;
      name: string;
      description: string | null;
      qty: number;
      unit: string | null;
      unitPrice: number;
      discountPercent: number;
      discountAmount: number;
      lineTotal: number;
    }[];
  },
) {
  const docNumber = await generateDocNumber(docType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'INVOICE');
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + totals.creditTermDays);

  const created = await prisma.invoice.create({
    data: {
      docNumber,
      docType,
      customerId,
      quotationId: source.quotationId,
      salesOrderId: source.salesOrderId,
      deliveryNoteId: source.deliveryNoteId,
      issueDate,
      dueDate,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      whtRate: totals.whtRate,
      whtAmount: totals.whtAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      balanceAmount: totals.netTotal,
      status: 'UNPAID',
      createdById: userId,
      items: {
        create: totals.items.map((i, idx) => ({
          sortOrder: idx,
          itemType: i.itemType,
          code: i.code,
          name: i.name,
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          discountAmount: i.discountAmount,
          lineTotal: i.lineTotal,
        })),
      },
    },
  });

  await writeAuditLog({ userId, action: 'CREATE', entityType: 'Invoice', entityId: created.id, newValue: { docType, source } });
  revalidatePath('/invoices');
  if (source.quotationId) revalidatePath(`/quotations/${source.quotationId}`);
  redirect(`/invoices/${created.id}`);
}

export async function cancelInvoice(id: string, reason: string) {
  const user = await assertPermission(PERMISSIONS.INVOICE_MANAGE);
  const existing = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED', note: reason } });
  await writeAuditLog({ userId: user.id, action: 'CANCEL', entityType: 'Invoice', entityId: id, oldValue: { status: existing.status }, newValue: { status: updated.status, reason } });
  revalidatePath(`/invoices/${id}`);
}

export async function recordPayment(invoiceId: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.PAYMENT_RECORD);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
  if (invoice.status === 'CANCELLED') throw new Error('ใบแจ้งหนี้นี้ถูกยกเลิกแล้ว');

  const amount = Number(formData.get('amount'));
  if (!amount || amount <= 0) throw new Error('กรุณากรอกจำนวนเงินที่ถูกต้อง');
  const currentBalance = Number(invoice.balanceAmount);
  if (amount > currentBalance + 0.01) throw new Error(`จำนวนเงินเกินยอดคงเหลือ (คงเหลือ ${currentBalance.toFixed(2)} บาท)`);

  const method = formData.get('method') as PaymentMethod;
  const paidDate = new Date(String(formData.get('paidDate') ?? new Date().toISOString()));
  const refNumber = String(formData.get('refNumber') ?? '') || null;
  const bankName = String(formData.get('bankName') ?? '') || null;
  const note = String(formData.get('note') ?? '') || null;

  const newBalance = round2(currentBalance - amount);
  const newPaidAmount = round2(Number(invoice.paidAmount) + amount);
  const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

  const { payment, invoice: updatedInvoice } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { invoiceId, paidDate, amount, method, refNumber, bankName, note, recordedById: user.id },
    });
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaidAmount, balanceAmount: newBalance, status: newStatus },
    });

    const receiptDocNumber = await generateDocNumber('RECEIPT');
    await tx.receipt.create({
      data: {
        docNumber: receiptDocNumber,
        invoiceId,
        paymentId: payment.id,
        receiptDate: paidDate,
        amount,
      },
    });
    return { payment, invoice };
  });

  await writeAuditLog({ userId: user.id, action: 'PAYMENT', entityType: 'Invoice', entityId: invoiceId, newValue: { amount, method, newStatus: updatedInvoice.status } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/receipts');
  return payment.id;
}
