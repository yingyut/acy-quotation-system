import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { parseProductImport, type ParsedProductRow } from '@/lib/excel/productExcel';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await assertPermission(PERMISSIONS.PRODUCT_IMPORT_EXPORT);
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'preview';

  if (mode === 'preview') {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseProductImport(buffer);

    const existingCodes = new Set(
      (await prisma.product.findMany({ where: { deletedAt: null }, select: { code: true } })).map((p) => p.code),
    );
    for (const row of rows) {
      if (existingCodes.has(row.code)) row.errors.push('รหัสสินค้านี้มีอยู่แล้วในระบบ');
    }

    return NextResponse.json({
      totalRows: rows.length,
      validRows: rows.filter((r) => r.errors.length === 0).length,
      rows,
    });
  }

  if (mode === 'commit') {
    const body = (await req.json()) as { rows: ParsedProductRow[] };
    const validRows = body.rows.filter((r) => r.errors.length === 0);

    const created = await prisma.$transaction(
      validRows.map((r) =>
        prisma.product.create({
          data: {
            code: r.code,
            sku: r.sku,
            name: r.name,
            nameEn: r.nameEn,
            brand: r.brand,
            model: r.model,
            unit: r.unit,
            costPrice: r.costPrice,
            sellPrice: r.sellPrice,
          },
        }),
      ),
    );

    await writeAuditLog({
      userId: user.id,
      action: 'IMPORT',
      entityType: 'Product',
      entityId: 'BULK',
      newValue: { count: created.length },
    });

    return NextResponse.json({ imported: created.length });
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}
