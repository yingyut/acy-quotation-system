'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { DEFAULT_SEQUENCE_CONFIG } from '@/lib/docNumber';
import type { DocType, ResetPolicy } from '@prisma/client';

export async function upsertSequenceConfig(docType: DocType, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.DOC_NUMBER_MANAGE);

  const prefix = String(formData.get('prefix') ?? '').trim();
  if (!prefix) throw new Error('กรุณากรอก Prefix');
  const yearFormat = String(formData.get('yearFormat') ?? 'CE'); // NONE | BE | CE
  const useMonth = formData.get('useMonth') === 'on';
  const useDay = formData.get('useDay') === 'on';
  const runningDigits = Number(formData.get('runningDigits') ?? 4);
  const resetPolicy = String(formData.get('resetPolicy') ?? 'YEARLY') as ResetPolicy;
  const separator = String(formData.get('separator') ?? '-');

  const config = {
    prefix,
    useYearBE: yearFormat === 'BE',
    useYearCE: yearFormat === 'CE',
    useMonth,
    useDay,
    runningDigits,
    resetPolicy,
    separator,
  };

  const existing = await prisma.documentSequence.findFirst({
    where: { docType, branchId: '', salespersonId: '' },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    await prisma.documentSequence.update({ where: { id: existing.id }, data: config });
  } else {
    await prisma.documentSequence.create({
      data: { docType, branchId: '', salespersonId: '', periodKey: 'PENDING', currentNumber: 0, ...config },
    });
  }

  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentSequence', entityId: docType, newValue: config });
  revalidatePath('/admin/document-numbers');
}

export async function getSequenceConfigs() {
  const docTypes = Object.keys(DEFAULT_SEQUENCE_CONFIG) as DocType[];
  const configs = await Promise.all(
    docTypes.map(async (docType) => {
      const row = await prisma.documentSequence.findFirst({
        where: { docType, branchId: '', salespersonId: '' },
        orderBy: { updatedAt: 'desc' },
      });
      return {
        docType,
        prefix: row?.prefix ?? DEFAULT_SEQUENCE_CONFIG[docType].prefix,
        useYearBE: row?.useYearBE ?? DEFAULT_SEQUENCE_CONFIG[docType].useYearBE,
        useYearCE: row?.useYearCE ?? DEFAULT_SEQUENCE_CONFIG[docType].useYearCE,
        useMonth: row?.useMonth ?? DEFAULT_SEQUENCE_CONFIG[docType].useMonth,
        useDay: row?.useDay ?? DEFAULT_SEQUENCE_CONFIG[docType].useDay,
        runningDigits: row?.runningDigits ?? DEFAULT_SEQUENCE_CONFIG[docType].runningDigits,
        resetPolicy: row?.resetPolicy ?? DEFAULT_SEQUENCE_CONFIG[docType].resetPolicy,
        separator: row?.separator ?? DEFAULT_SEQUENCE_CONFIG[docType].separator,
        lastDocNumber: row?.lastDocNumber ?? null,
        currentNumber: row?.currentNumber ?? 0,
      };
    }),
  );
  return configs;
}
