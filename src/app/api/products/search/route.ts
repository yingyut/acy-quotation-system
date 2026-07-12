import { NextRequest, NextResponse } from 'next/server';
import { assertPermission, canViewCost } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_VIEW);
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const showCost = canViewCost(user) && user.permissions.includes(PERMISSIONS.PRODUCT_VIEW_COST);

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      sellPrice: true,
      installSellPrice: true,
      costPrice: true,
      installCostPrice: true,
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
    },
    take: 100,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      unit: p.unit,
      sellPrice: Number(p.sellPrice),
      installSellPrice: Number(p.installSellPrice),
      costPrice: showCost ? Number(p.costPrice) : 0,
      installCostPrice: showCost ? Number(p.installCostPrice) : 0,
      imageUrl: p.images[0]?.url ?? null,
    })),
  );
}
