'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import {
  documentTemplateConfigSchema,
  buildDefaultTemplateConfig,
  parseTemplateConfig,
  type DocumentTemplateConfig,
} from '@/lib/pdf/templateConfig';

export async function createTemplate(name: string, applicableDocTypes: string[]) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  const created = await prisma.documentTemplate.create({
    data: {
      name,
      applicableDocTypes,
      config: buildDefaultTemplateConfig(),
    },
  });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'DocumentTemplate', entityId: created.id, newValue: created });
  revalidatePath('/admin/templates');
  redirect(`/admin/templates/${created.id}/edit`);
}

export async function updateTemplateConfig(
  id: string,
  meta: { name: string; description: string | null; applicableDocTypes: string[] },
  config: DocumentTemplateConfig,
) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  const validated = documentTemplateConfigSchema.parse(config);

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data: {
      name: meta.name,
      description: meta.description,
      applicableDocTypes: meta.applicableDocTypes,
      config: validated,
    },
  });
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentTemplate', entityId: id, newValue: updated });
  revalidatePath('/admin/templates');
  revalidatePath(`/admin/templates/${id}/edit`);
  return { ok: true };
}

export async function duplicateTemplate(id: string) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  const source = await prisma.documentTemplate.findUniqueOrThrow({ where: { id } });
  const copy = await prisma.documentTemplate.create({
    data: {
      name: `${source.name} (สำเนา)`,
      description: source.description,
      applicableDocTypes: source.applicableDocTypes,
      config: source.config ?? buildDefaultTemplateConfig(),
      isDefault: false,
    },
  });
  await writeAuditLog({ userId: user.id, action: 'CREATE', entityType: 'DocumentTemplate', entityId: copy.id, newValue: { duplicatedFrom: id } });
  revalidatePath('/admin/templates');
  redirect(`/admin/templates/${copy.id}/edit`);
}

export async function resetTemplateToDefault(id: string) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  const defaultConfig = buildDefaultTemplateConfig();
  const updated = await prisma.documentTemplate.update({ where: { id }, data: { config: defaultConfig } });
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentTemplate', entityId: id, newValue: { reset: true } });
  revalidatePath(`/admin/templates/${id}/edit`);
  return { config: parseTemplateConfig(updated.config) };
}

export async function setDefaultTemplate(id: string) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  const template = await prisma.documentTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.documentTemplate.updateMany({
      data: { isDefault: false },
      where: { applicableDocTypes: { hasSome: template.applicableDocTypes } },
    }),
    prisma.documentTemplate.update({ where: { id }, data: { isDefault: true } }),
  ]);
  await writeAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'DocumentTemplate', entityId: id, newValue: { isDefault: true } });
  revalidatePath('/admin/templates');
  revalidatePath(`/admin/templates/${id}/edit`);
}

export async function deleteTemplate(id: string) {
  const user = await assertPermission(PERMISSIONS.TEMPLATE_MANAGE);
  await prisma.documentTemplate.delete({ where: { id } });
  await writeAuditLog({ userId: user.id, action: 'DELETE', entityType: 'DocumentTemplate', entityId: id, newValue: null });
  revalidatePath('/admin/templates');
}
