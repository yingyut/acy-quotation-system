import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  await assertPermission(PERMISSIONS.CUSTOMER_VIEW);
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      ...(q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }
        : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      creditTermDays: true,
      defaultDiscountPercent: true,
      contacts: { select: { id: true, name: true }, take: 5 },
    },
    take: 50,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(customers);
}
