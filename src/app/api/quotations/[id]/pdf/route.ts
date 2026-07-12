import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { generateQuotationPdf } from '@/lib/pdf/generateQuotationPdf';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await assertPermission(PERMISSIONS.QUOTATION_EXPORT_PDF);

  const copiesParam = req.nextUrl.searchParams.get('copies') ?? 'ORIGINAL';
  const copyTypes = copiesParam
    .split(',')
    .map((c) => c.trim())
    .filter((c): c is CopyType => VALID_COPY_TYPES.includes(c as CopyType));
  if (copyTypes.length === 0) copyTypes.push('ORIGINAL');

  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: params.id } });

  const pdf = await generateQuotationPdf(params.id, user.id, copyTypes);

  await writeAuditLog({
    userId: user.id,
    action: 'EXPORT_PDF',
    entityType: 'Quotation',
    entityId: params.id,
    newValue: { copies: copyTypes },
  });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quotation.docNumber}.pdf"`,
    },
  });
}
