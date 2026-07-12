'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { saveImage, deleteStoredFile } from '@/lib/storage';

export async function getOrCreateCompany() {
  const existing = await prisma.company.findFirst({
    include: { branches: true, bankAccounts: true },
  });
  if (existing) return existing;

  return prisma.company.create({
    data: { nameTh: '', nameEn: '', taxId: '', addressTh: '' },
    include: { branches: true, bankAccounts: true },
  });
}

const companyProfileSchema = z.object({
  nameTh: z.string().min(1, 'กรุณากรอกชื่อบริษัทภาษาไทย'),
  nameEn: z.string().min(1, 'กรุณากรอกชื่อบริษัทภาษาอังกฤษ'),
  taxId: z.string().min(1, 'กรุณากรอกเลขประจำตัวผู้เสียภาษี'),
  addressTh: z.string().min(1, 'กรุณากรอกที่อยู่'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  standardTerms: z.string().optional(),
  footerText: z.string().optional(),
  primaryColor: z.string().optional(),
  headerLayout: z.string().optional(),
});

export async function updateCompanyProfile(formData: FormData) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  const company = await getOrCreateCompany();

  const parsed = companyProfileSchema.parse({
    nameTh: formData.get('nameTh'),
    nameEn: formData.get('nameEn'),
    taxId: formData.get('taxId'),
    addressTh: formData.get('addressTh'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || '',
    website: formData.get('website') || undefined,
    standardTerms: formData.get('standardTerms') || undefined,
    footerText: formData.get('footerText') || undefined,
    primaryColor: formData.get('primaryColor') || undefined,
    headerLayout: formData.get('headerLayout') || undefined,
  });

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: parsed,
  });

  await writeAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Company',
    entityId: company.id,
    oldValue: company,
    newValue: updated,
  });

  revalidatePath('/admin/company');
}

const ASSET_FIELDS = ['logoUrl', 'stampUrl', 'authorizedSignatureUrl', 'preparedSignatureUrl'] as const;
type AssetField = (typeof ASSET_FIELDS)[number];

export async function uploadCompanyAsset(field: AssetField, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  if (!ASSET_FIELDS.includes(field)) throw new Error('Invalid asset field');

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('กรุณาเลือกไฟล์');

  const company = await getOrCreateCompany();
  const saved = await saveImage(file, 'company');

  const previousUrl = (company as unknown as Record<AssetField, string | null>)[field];
  if (previousUrl) await deleteStoredFile(previousUrl.replace(/^\/api\/files\//, ''));

  await prisma.company.update({ where: { id: company.id }, data: { [field]: saved.url } });
  await writeAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Company',
    entityId: company.id,
    oldValue: { [field]: previousUrl },
    newValue: { [field]: saved.url },
  });

  revalidatePath('/admin/company');
}

export async function addBankAccount(formData: FormData) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  const company = await getOrCreateCompany();

  const bankName = String(formData.get('bankName') ?? '').trim();
  const accountName = String(formData.get('accountName') ?? '').trim();
  const accountNumber = String(formData.get('accountNumber') ?? '').trim();
  const branchName = String(formData.get('branchName') ?? '').trim() || null;
  if (!bankName || !accountName || !accountNumber) throw new Error('กรุณากรอกข้อมูลบัญชีธนาคารให้ครบ');

  const created = await prisma.bankAccount.create({
    data: { companyId: company.id, bankName, accountName, accountNumber, branchName },
  });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'BankAccount', entityId: created.id, newValue: created });
  revalidatePath('/admin/company');
}

export async function deleteBankAccount(id: string) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  const existing = await prisma.bankAccount.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'BankAccount', entityId: id, oldValue: existing });
  revalidatePath('/admin/company');
}

export async function addBranch(formData: FormData) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  const company = await getOrCreateCompany();

  const code = String(formData.get('code') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim() || null;
  const isHeadOffice = formData.get('isHeadOffice') === 'on';
  if (!code || !name) throw new Error('กรุณากรอกรหัสและชื่อสาขา');

  const created = await prisma.branch.create({
    data: { companyId: company.id, code, name, address, isHeadOffice },
  });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'Branch', entityId: created.id, newValue: created });
  revalidatePath('/admin/company');
}

export async function deleteBranch(id: string) {
  const user = await assertPermission(PERMISSIONS.COMPANY_MANAGE);
  const existing = await prisma.branch.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'Branch', entityId: id, oldValue: existing });
  revalidatePath('/admin/company');
}
