import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { parseTemplateConfig } from '@/lib/pdf/templateConfig';
import { TemplateEditor } from '@/components/admin/TemplateEditor';

export default async function TemplateEditPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.TEMPLATE_MANAGE);
  const template = await prisma.documentTemplate.findUnique({ where: { id: params.id } });
  if (!template) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">แก้ไข Template: {template.name}</h1>
      <TemplateEditor
        templateId={template.id}
        initialName={template.name}
        initialDescription={template.description ?? ''}
        initialApplicableDocTypes={template.applicableDocTypes}
        initialIsDefault={template.isDefault}
        initialConfig={parseTemplateConfig(template.config)}
      />
    </div>
  );
}
