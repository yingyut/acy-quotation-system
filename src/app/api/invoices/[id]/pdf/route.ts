import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { generateInvoicePdf } from '@/lib/pdf/generateInvoicePdf';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import type { CopyType } from '@/lib/pdf/types';

const VALID_COPY_TYPES: CopyType[] = ['ORIGINAL', 'COPY_CUSTOMER', 'COPY_ACCOUNTING', 'COPY_WAREHOUSE', 'COPY_SALES'];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await assertPermission(PERMISSIONS.INVOICE_PRINT);

  const copiesParam = req.nextUrl.searchParams.get('copies') ?? 'ORIGINAL';
  const copyTypes = copiesParam
    .split(',')
    .map((c) => c.trim())
    .filter((c): c is CopyType => VALID_COPY_TYPES.includes(c as CopyType));
  if (copyTypes.length === 0) copyTypes.push('ORIGINAL');

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: params.id } });
  const pdf = await generateInvoicePdf(params.id, user.id, copyTypes);

  await writeAuditLog({ userId: user.id, action: 'EXPORT_PDF', entityType: 'Invoice', entityId: params.id, newValue: { copies: copyTypes } });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.docNumber}.pdf"`,
    },
  });
}
