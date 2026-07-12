import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { generateReceiptPdf } from '@/lib/pdf/generateReceiptPdf';
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

  const receipt = await prisma.receipt.findUniqueOrThrow({ where: { id: params.id } });
  const pdf = await generateReceiptPdf(params.id, user.id, copyTypes);

  await writeAuditLog({ userId: user.id, action: 'EXPORT_PDF', entityType: 'Receipt', entityId: params.id, newValue: { copies: copyTypes } });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${receipt.docNumber}.pdf"`,
    },
  });
}
