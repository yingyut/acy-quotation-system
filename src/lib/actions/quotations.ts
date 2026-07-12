'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { assertPermission, getCurrentUser } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { generateDocNumber } from '@/lib/docNumber';
import { calcQuotationTotals, evaluateApprovalRequirement, type CalcItemType } from '@/lib/calc';
import { bahtText } from '@/lib/money';
import type { QuotationItemType } from '@prisma/client';

export interface QuotationItemInput {
  itemType: QuotationItemType;
  productId?: string | null;
  code?: string;
  name: string;
  description?: string;
  specText?: string;
  imageUrl?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  unitCost: number;
  discountPercent?: number;
  discountAmount?: number;
  hideUnitPrice?: boolean;
  showImage?: boolean;
}

export interface SaveQuotationInput {
  customerId: string;
  contactName?: string;
  projectName?: string;
  title?: string;
  quoteDate: string;
  validUntilDays: number;
  deliveryTerms?: string;
  creditTermDays: number;
  paymentTerms?: string;
  templateId?: string | null;
  vatEnabled: boolean;
  vatRate: number;
  whtEnabled: boolean;
  whtRate: number;
  billDiscountPercent?: number;
  billDiscountAmount?: number;
  note?: string;
  items: QuotationItemInput[];
}

async function getSettingsThresholds() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['quotation.minGpPercent', 'quotation.maxDiscountPercentWithoutApproval'] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    minGpPercent: Number(map['quotation.minGpPercent'] ?? 15),
    maxDiscountPercentWithoutApproval: Number(map['quotation.maxDiscountPercentWithoutApproval'] ?? 15),
  };
}

function toCalcItems(items: QuotationItemInput[]) {
  return items.map((i) => ({
    itemType: i.itemType as CalcItemType,
    qty: i.qty,
    unitPrice: i.unitPrice,
    unitCost: i.unitCost,
    discountPercent: i.discountPercent ?? 0,
    discountAmount: i.discountAmount ?? 0,
  }));
}

async function computeAndCheckApproval(input: SaveQuotationInput) {
  const totals = calcQuotationTotals({
    items: toCalcItems(input.items),
    billDiscountPercent: input.billDiscountPercent ?? 0,
    billDiscountAmount: input.billDiscountAmount ?? 0,
    vatEnabled: input.vatEnabled,
    vatRate: input.vatRate,
    whtEnabled: input.whtEnabled,
    whtRate: input.whtRate,
  });

  const thresholds = await getSettingsThresholds();
  const maxLineDiscountPercent = Math.max(
    0,
    ...input.items.map((i) => Number(i.discountPercent ?? 0)),
  );
  const billDiscountPercent =
    input.billDiscountPercent ??
    (totals.subtotal > 0 ? (totals.billDiscount / (totals.subtotal - totals.lineDiscountTotal)) * 100 : 0);

  const approval = evaluateApprovalRequirement({
    gpPercent: totals.gpPercent,
    billDiscountPercent,
    maxLineDiscountPercent,
    minGpPercent: thresholds.minGpPercent,
    maxDiscountPercentWithoutApproval: thresholds.maxDiscountPercentWithoutApproval,
  });

  return { totals, approval };
}

export async function createQuotation(customerId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CREATE);
  if (!customerId) throw new Error('กรุณาเลือกลูกค้า');

  const docNumber = await generateDocNumber('QUOTATION');
  const created = await prisma.quotation.create({
    data: {
      docNumber,
      revisionNo: 0,
      isLatestRevision: true,
      customerId,
      preparedById: user.id,
      status: 'DRAFT',
    },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Quotation', entityId: created.id, newValue: created });
  revalidatePath('/quotations');
  redirect(`/quotations/${created.id}/edit`);
}

async function assertEditable(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CREATE);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });

  const isOwner = quotation.preparedById === user.id;
  const canEditAll = user.permissions.includes(PERMISSIONS.QUOTATION_EDIT_ALL);
  const canEditOwn = user.permissions.includes(PERMISSIONS.QUOTATION_EDIT_OWN) && isOwner;

  if (!canEditAll && !canEditOwn) throw new Error('ไม่มีสิทธิ์แก้ไขใบเสนอราคานี้');
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(quotation.status)) {
    throw new Error('ไม่สามารถแก้ไขใบเสนอราคาที่อนุมัติ หรือปิดงานแล้วได้');
  }
  if (quotation.status === 'PENDING_APPROVAL' && !canEditAll) {
    throw new Error('เอกสารรออนุมัติ แก้ไขได้เฉพาะ Sales Manager');
  }
  return { user, quotation };
}

export async function saveQuotation(quotationId: string, input: SaveQuotationInput) {
  const { user, quotation } = await assertEditable(quotationId);
  if (input.items.length === 0) throw new Error('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');

  const { totals, approval } = await computeAndCheckApproval(input);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId } });
    return tx.quotation.update({
      where: { id: quotationId },
      data: {
        customerId: input.customerId,
        contactName: input.contactName,
        projectName: input.projectName,
        title: input.title,
        quoteDate: new Date(input.quoteDate),
        validUntilDays: input.validUntilDays,
        deliveryTerms: input.deliveryTerms,
        creditTermDays: input.creditTermDays,
        paymentTerms: input.paymentTerms,
        templateId: input.templateId || null,
        vatEnabled: input.vatEnabled,
        vatRate: input.vatRate,
        whtEnabled: input.whtEnabled,
        whtRate: input.whtRate,
        note: input.note,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        amountAfterDiscount: totals.amountAfterDiscount,
        vatAmount: totals.vatAmount,
        whtAmount: totals.whtAmount,
        netTotal: totals.netTotal,
        amountInWordsTh: bahtText(totals.netTotal),
        totalCost: totals.totalCost,
        totalProfit: totals.totalProfit,
        gpPercent: totals.gpPercent,
        markupPercent: totals.markupPercent,
        requiresApproval: approval.requiresApproval,
        approvalReason: approval.reasons.join('; ') || null,
        items: {
          create: input.items.map((item, idx) => ({
            sortOrder: idx,
            itemType: item.itemType,
            productId: item.productId || null,
            code: item.code,
            name: item.name,
            description: item.description,
            specText: item.specText,
            imageUrl: item.imageUrl,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            discountPercent: item.discountPercent ?? 0,
            discountAmount: item.discountAmount ?? 0,
            lineTotal:
              item.itemType === 'TEXT' || item.itemType === 'HEADING'
                ? 0
                : item.qty * item.unitPrice - (item.discountAmount ?? (item.qty * item.unitPrice * (item.discountPercent ?? 0)) / 100),
            lineCost: item.itemType === 'TEXT' || item.itemType === 'HEADING' ? 0 : item.qty * item.unitCost,
            hideUnitPrice: item.hideUnitPrice ?? false,
            showImage: item.showImage ?? false,
          })),
        },
      },
    });
  });

  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'Quotation', entityId: quotationId, oldValue: quotation, newValue: updated });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath('/quotations');
  return { requiresApproval: approval.requiresApproval, reasons: approval.reasons };
}

export async function submitQuotation(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CREATE);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.status !== 'DRAFT') throw new Error('ส่งอนุมัติได้เฉพาะเอกสารสถานะ Draft');

  const newStatus = quotation.requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';
  const updated = await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: newStatus,
      approvedById: newStatus === 'APPROVED' ? user.id : null,
      approvedAt: newStatus === 'APPROVED' ? new Date() : null,
    },
  });

  if (quotation.requiresApproval) {
    await prisma.approvalLog.create({
      data: {
        quotationId,
        action: 'REQUESTED',
        requestedById: user.id,
        reason: quotation.approvalReason,
        gpPercentAtRequest: quotation.gpPercent,
      },
    });
  }

  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, oldValue: { status: quotation.status }, newValue: { status: newStatus } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath('/quotations');
}

export async function approveQuotation(quotationId: string, reason?: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_APPROVE);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.status !== 'PENDING_APPROVAL') throw new Error('เอกสารนี้ไม่ได้อยู่ระหว่างรออนุมัติ');

  const updated = await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date() },
  });
  await prisma.approvalLog.create({
    data: { quotationId, action: 'APPROVED', actorId: user.id, reason },
  });

  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, oldValue: { status: quotation.status }, newValue: { status: updated.status } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath('/quotations');
}

export async function rejectQuotation(quotationId: string, reason: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_APPROVE);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.status !== 'PENDING_APPROVAL') throw new Error('เอกสารนี้ไม่ได้อยู่ระหว่างรออนุมัติ');

  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'DRAFT' } });
  await prisma.approvalLog.create({ data: { quotationId, action: 'REJECTED', actorId: user.id, reason } });

  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, oldValue: { status: quotation.status }, newValue: { status: updated.status } });
  revalidatePath(`/quotations/${quotationId}`);
}

async function assertOwnerOrManager(quotationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  const canEditAll = user.permissions.includes(PERMISSIONS.QUOTATION_EDIT_ALL);
  if (!canEditAll && quotation.preparedById !== user.id) throw new Error('ไม่มีสิทธิ์ดำเนินการนี้');
  return { user, quotation };
}

export async function markSent(quotationId: string) {
  const { user, quotation } = await assertOwnerOrManager(quotationId);
  if (quotation.status !== 'APPROVED') throw new Error('ส่งลูกค้าได้เฉพาะเอกสารที่อนุมัติแล้ว');
  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'SENT' } });
  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, oldValue: { status: quotation.status }, newValue: { status: updated.status } });
  revalidatePath(`/quotations/${quotationId}`);
}

export async function markAccepted(quotationId: string) {
  const { user } = await assertOwnerOrManager(quotationId);
  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'ACCEPTED' } });
  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, newValue: { status: updated.status } });
  revalidatePath(`/quotations/${quotationId}`);
}

export async function markWon(quotationId: string) {
  const { user } = await assertOwnerOrManager(quotationId);
  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'WON' } });
  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, newValue: { status: updated.status } });
  revalidatePath(`/quotations/${quotationId}`);
}

export async function markLost(quotationId: string, reason: string) {
  const { user } = await assertOwnerOrManager(quotationId);
  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'LOST', lostReason: reason } });
  await writeAuditLog({ userId: user.id, action: 'STATUS_CHANGE', entityType: 'Quotation', entityId: quotationId, newValue: { status: updated.status, lostReason: reason } });
  revalidatePath(`/quotations/${quotationId}`);
}

export async function cancelQuotation(quotationId: string, reason: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CANCEL);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  const updated = await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: 'CANCELLED', cancelReason: reason },
  });
  await writeAuditLog({ userId: user.id, action: 'CANCEL', entityType: 'Quotation', entityId: quotationId, oldValue: { status: quotation.status }, newValue: { status: updated.status, cancelReason: reason } });
  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath('/quotations');
}

async function copyItemsData(sourceQuotationId: string) {
  const items = await prisma.quotationItem.findMany({ where: { quotationId: sourceQuotationId }, orderBy: { sortOrder: 'asc' } });
  return items.map((i) => ({
    sortOrder: i.sortOrder,
    itemType: i.itemType,
    productId: i.productId,
    code: i.code,
    name: i.name,
    description: i.description,
    specText: i.specText,
    imageUrl: i.imageUrl,
    qty: i.qty,
    unit: i.unit,
    unitPrice: i.unitPrice,
    unitCost: i.unitCost,
    discountPercent: i.discountPercent,
    discountAmount: i.discountAmount,
    lineTotal: i.lineTotal,
    lineCost: i.lineCost,
    hideUnitPrice: i.hideUnitPrice,
    showImage: i.showImage,
  }));
}

export async function duplicateQuotation(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CREATE);
  const original = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  const items = await copyItemsData(quotationId);

  const docNumber = await generateDocNumber('QUOTATION');
  const created = await prisma.quotation.create({
    data: {
      docNumber,
      revisionNo: 0,
      isLatestRevision: true,
      customerId: original.customerId,
      contactName: original.contactName,
      projectName: original.projectName,
      title: original.title ? `${original.title} (สำเนา)` : null,
      deliveryTerms: original.deliveryTerms,
      creditTermDays: original.creditTermDays,
      paymentTerms: original.paymentTerms,
      templateId: original.templateId,
      vatEnabled: original.vatEnabled,
      vatRate: original.vatRate,
      whtEnabled: original.whtEnabled,
      whtRate: original.whtRate,
      preparedById: user.id,
      status: 'DRAFT',
      items: { create: items },
    },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Quotation', entityId: created.id, newValue: { duplicatedFrom: quotationId } });
  revalidatePath('/quotations');
  redirect(`/quotations/${created.id}/edit`);
}

export async function createRevision(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_CREATE);
  const original = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (!original.isLatestRevision) throw new Error('สามารถสร้าง Revision ได้จากเอกสารล่าสุดเท่านั้น');

  const items = await copyItemsData(quotationId);

  const created = await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: quotationId }, data: { isLatestRevision: false } });
    const rev = await tx.quotation.create({
      data: {
        docNumber: original.docNumber,
        revisionNo: original.revisionNo + 1,
        isLatestRevision: true,
        rootQuotationId: original.rootQuotationId ?? original.id,
        customerId: original.customerId,
        contactName: original.contactName,
        projectName: original.projectName,
        title: original.title,
        deliveryTerms: original.deliveryTerms,
        creditTermDays: original.creditTermDays,
        paymentTerms: original.paymentTerms,
        templateId: original.templateId,
        vatEnabled: original.vatEnabled,
        vatRate: original.vatRate,
        whtEnabled: original.whtEnabled,
        whtRate: original.whtRate,
        preparedById: user.id,
        status: 'DRAFT',
        items: { create: items },
      },
    });
    await tx.quotationRevisionLog.create({
      data: { quotationId: rev.id, revisionNo: rev.revisionNo, createdById: user.id, changeSummary: 'สร้าง Revision ใหม่' },
    });
    return rev;
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Quotation', entityId: created.id, newValue: { revisionOf: quotationId } });
  revalidatePath(`/quotations/${quotationId}`);
  redirect(`/quotations/${created.id}/edit`);
}

export async function deleteDraftQuotation(quotationId: string) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_DELETE);
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.status !== 'DRAFT') throw new Error('ลบได้เฉพาะเอกสารสถานะ Draft เท่านั้น (soft delete)');

  const updated = await prisma.quotation.update({ where: { id: quotationId }, data: { deletedAt: new Date() } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'Quotation', entityId: quotationId, oldValue: quotation, newValue: updated });
  revalidatePath('/quotations');
  redirect('/quotations');
}
