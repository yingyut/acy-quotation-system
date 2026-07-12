import { notFound, redirect } from 'next/navigation';
import { requirePermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { QuotationEditor } from '@/components/QuotationEditor';

export default async function EditQuotationPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.QUOTATION_CREATE);
  const showCost = canViewCost(user) && user.permissions.includes(PERMISSIONS.QUOTATION_VIEW_COST);

  const quotation = await prisma.quotation.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { customer: true, items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!quotation) notFound();

  const isOwner = quotation.preparedById === user.id;
  const canEditAll = user.permissions.includes(PERMISSIONS.QUOTATION_EDIT_ALL);
  const canEditOwn = user.permissions.includes(PERMISSIONS.QUOTATION_EDIT_OWN) && isOwner;
  if (!canEditAll && !canEditOwn) redirect(`/quotations/${quotation.id}`);
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(quotation.status)) redirect(`/quotations/${quotation.id}`);

  const [templates, settings] = await Promise.all([
    prisma.documentTemplate.findMany({
      where: { applicableDocTypes: { has: 'QUOTATION' } },
      orderBy: { name: 'asc' },
    }),
    prisma.setting.findMany({
      where: { key: { in: ['quotation.minGpPercent', 'quotation.maxDiscountPercentWithoutApproval'] } },
    }),
  ]);
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          แก้ไขใบเสนอราคา {quotation.docNumber} {quotation.revisionNo > 0 ? `Rev.${quotation.revisionNo}` : ''}
        </h1>
      </div>
      <QuotationEditor
        quotationId={quotation.id}
        showCost={showCost}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        approvalThresholds={{
          minGpPercent: Number(settingsMap['quotation.minGpPercent'] ?? 15),
          maxDiscountPercentWithoutApproval: Number(settingsMap['quotation.maxDiscountPercentWithoutApproval'] ?? 15),
        }}
        initial={{
          customerId: quotation.customerId,
          customerLabel: quotation.customer.name,
          contactName: quotation.contactName ?? '',
          projectName: quotation.projectName ?? '',
          title: quotation.title ?? '',
          quoteDate: quotation.quoteDate.toISOString().slice(0, 10),
          validUntilDays: quotation.validUntilDays,
          deliveryTerms: quotation.deliveryTerms ?? '',
          creditTermDays: quotation.creditTermDays,
          paymentTerms: quotation.paymentTerms ?? '',
          templateId: quotation.templateId ?? templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '',
          vatEnabled: quotation.vatEnabled,
          vatRate: Number(quotation.vatRate),
          whtEnabled: quotation.whtEnabled,
          whtRate: Number(quotation.whtRate),
          billDiscountPercent: 0,
          billDiscountAmount: 0,
          note: quotation.note ?? '',
          items: quotation.items.map((i) => ({
            clientId: i.id,
            itemType: i.itemType,
            productId: i.productId ?? undefined,
            code: i.code ?? undefined,
            name: i.name,
            description: i.description ?? undefined,
            specText: i.specText ?? undefined,
            imageUrl: i.imageUrl ?? undefined,
            qty: Number(i.qty),
            unit: i.unit ?? undefined,
            unitPrice: Number(i.unitPrice),
            unitCost: Number(i.unitCost),
            discountPercent: Number(i.discountPercent),
            discountAmount: Number(i.discountAmount),
            hideUnitPrice: i.hideUnitPrice,
            showImage: i.showImage,
          })),
        }}
      />
    </div>
  );
}
