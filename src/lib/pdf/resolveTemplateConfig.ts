import { prisma } from '@/lib/prisma';
import { parseTemplateConfig, buildDefaultTemplateConfig, type DocumentTemplateConfig } from '@/lib/pdf/templateConfig';

/**
 * Looks up the layout configuration that applies to a document. Quotation
 * rows may pin an explicit template via `templateId`; every other document
 * type (Invoice/TaxInvoice/Receipt/DeliveryNote) has no per-row template
 * FK, so it resolves via `DocumentTemplate.applicableDocTypes` - the
 * admin-marked default template for that doc type, falling back to the
 * oldest template that declares itself applicable, falling back to the
 * hard-coded schema defaults if no template row exists at all.
 */
export async function resolveTemplateConfig(
  docType: string,
  explicitTemplateId?: string | null,
): Promise<DocumentTemplateConfig> {
  if (explicitTemplateId) {
    const explicit = await prisma.documentTemplate.findUnique({ where: { id: explicitTemplateId } });
    if (explicit?.config) return parseTemplateConfig(explicit.config);
  }

  const defaultForType = await prisma.documentTemplate.findFirst({
    where: { applicableDocTypes: { has: docType }, isDefault: true },
  });
  if (defaultForType?.config) return parseTemplateConfig(defaultForType.config);

  const anyForType = await prisma.documentTemplate.findFirst({
    where: { applicableDocTypes: { has: docType } },
    orderBy: { createdAt: 'asc' },
  });
  if (anyForType?.config) return parseTemplateConfig(anyForType.config);

  return buildDefaultTemplateConfig();
}
