'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';

export async function updateTemplate(id: string, formData: FormData) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);

  const data = {
    logoPosition: String(formData.get('logoPosition') ?? 'LEFT'),
    headerColor: String(formData.get('headerColor') ?? '#0F4C81'),
    fontSizeBase: Number(formData.get('fontSizeBase') ?? 10),
    marginTopMm: Number(formData.get('marginTopMm') ?? 15),
    marginRightMm: Number(formData.get('marginRightMm') ?? 12),
    marginBottomMm: Number(formData.get('marginBottomMm') ?? 15),
    marginLeftMm: Number(formData.get('marginLeftMm') ?? 12),
    showProductCode: formData.get('showProductCode') === 'on',
    showUnitPrice: formData.get('showUnitPrice') === 'on',
    showDiscountColumn: formData.get('showDiscountColumn') === 'on',
    productImageMode: String(formData.get('productImageMode') ?? 'NONE'),
    specMode: String(formData.get('specMode') ?? 'NONE'),
    showDatasheetAppendix: formData.get('showDatasheetAppendix') === 'on',
    showPageNumber: formData.get('showPageNumber') === 'on',
    footerText: String(formData.get('footerText') ?? '') || null,
  };

  const updated = await prisma.documentTemplate.update({ where: { id }, data });
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentTemplate', entityId: id, newValue: updated });
  revalidatePath('/admin/templates');
}

export async function setDefaultTemplate(id: string) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  await prisma.$transaction([
    prisma.documentTemplate.updateMany({ data: { isDefault: false }, where: {} }),
    prisma.documentTemplate.update({ where: { id }, data: { isDefault: true } }),
  ]);
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentTemplate', entityId: id, newValue: { isDefault: true } });
  revalidatePath('/admin/templates');
}
