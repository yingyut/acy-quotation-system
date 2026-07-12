'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';

const customerSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสลูกค้า'),
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
  name: z.string().min(1, 'กรุณากรอกชื่อลูกค้า'),
  contactName: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  lineId: z.string().optional(),
  taxId: z.string().optional(),
  isHeadOffice: z.boolean().default(true),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  creditTermDays: z.coerce.number().int().min(0).default(0),
  defaultDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  note: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

function parseCustomerForm(formData: FormData) {
  return customerSchema.parse({
    code: formData.get('code'),
    type: formData.get('type'),
    name: formData.get('name'),
    contactName: formData.get('contactName') || undefined,
    address: formData.get('address') || undefined,
    province: formData.get('province') || undefined,
    postalCode: formData.get('postalCode') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || '',
    lineId: formData.get('lineId') || undefined,
    taxId: formData.get('taxId') || undefined,
    isHeadOffice: formData.get('isHeadOffice') === 'on',
    branchName: formData.get('branchName') || undefined,
    branchCode: formData.get('branchCode') || undefined,
    creditTermDays: formData.get('creditTermDays') || 0,
    defaultDiscountPercent: formData.get('defaultDiscountPercent') || 0,
    note: formData.get('note') || undefined,
    status: formData.get('status') || 'ACTIVE',
  });
}

export async function checkDuplicateCustomer(taxId: string | undefined, name: string) {
  if (taxId) {
    const byTaxId = await prisma.customer.findFirst({ where: { taxId, deletedAt: null } });
    if (byTaxId) return { duplicate: true, reason: `เลขผู้เสียภาษีนี้ถูกใช้แล้วโดยลูกค้า "${byTaxId.name}"` };
  }
  const byName = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
  });
  if (byName) return { duplicate: true, reason: `มีลูกค้าชื่อ "${byName.name}" อยู่แล้วในระบบ` };
  return { duplicate: false, reason: null };
}

export async function createCustomer(formData: FormData) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_MANAGE);
  const data = parseCustomerForm(formData);

  if (data.taxId) {
    const dup = await prisma.customer.findFirst({ where: { taxId: data.taxId, deletedAt: null } });
    if (dup) throw new Error(`เลขประจำตัวผู้เสียภาษีนี้ถูกใช้แล้วโดยลูกค้า "${dup.name}"`);
  }

  const created = await prisma.customer.create({
    data: { ...data, taxId: data.taxId || null, createdById: user.id },
  });

  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Customer', entityId: created.id, newValue: created });
  revalidatePath('/customers');
  redirect(`/customers/${created.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_MANAGE);
  const data = parseCustomerForm(formData);
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id } });

  if (data.taxId) {
    const dup = await prisma.customer.findFirst({
      where: { taxId: data.taxId, deletedAt: null, NOT: { id } },
    });
    if (dup) throw new Error(`เลขประจำตัวผู้เสียภาษีนี้ถูกใช้แล้วโดยลูกค้า "${dup.name}"`);
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: { ...data, taxId: data.taxId || null },
  });

  await writeAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Customer',
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });
  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
}

export async function softDeleteCustomer(id: string) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_MANAGE);
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });

  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'Customer', entityId: id, oldValue: existing, newValue: updated });
  revalidatePath('/customers');
}

export async function addCustomerContact(customerId: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_MANAGE);
  const name = String(formData.get('name') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const email = String(formData.get('email') ?? '').trim() || null;
  if (!name) throw new Error('กรุณากรอกชื่อผู้ติดต่อ');

  const created = await prisma.customerContact.create({
    data: { customerId, name, position, phone, email },
  });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'CustomerContact', entityId: created.id, newValue: created });
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomerContact(customerId: string, id: string) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_MANAGE);
  const existing = await prisma.customerContact.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'CustomerContact', entityId: id, oldValue: existing });
  revalidatePath(`/customers/${customerId}`);
}
