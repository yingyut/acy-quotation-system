import { NextRequest, NextResponse } from 'next/server';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { parseCustomerImport, type ParsedCustomerRow } from '@/lib/excel/customerExcel';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await assertPermission(PERMISSIONS.CUSTOMER_IMPORT_EXPORT);
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'preview';

  if (mode === 'preview') {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseCustomerImport(buffer);

    // Cross-check against existing DB records (code / taxId already used).
    const existingCodes = new Set(
      (await prisma.customer.findMany({ where: { deletedAt: null }, select: { code: true } })).map((c) => c.code),
    );
    const existingTaxIds = new Set(
      (
        await prisma.customer.findMany({
          where: { deletedAt: null, taxId: { not: null } },
          select: { taxId: true },
        })
      ).map((c) => c.taxId as string),
    );

    for (const row of rows) {
      if (existingCodes.has(row.code)) row.errors.push('รหัสลูกค้านี้มีอยู่แล้วในระบบ');
      if (row.taxId && existingTaxIds.has(row.taxId)) row.errors.push('เลขผู้เสียภาษีนี้มีอยู่แล้วในระบบ');
    }

    return NextResponse.json({
      totalRows: rows.length,
      validRows: rows.filter((r) => r.errors.length === 0).length,
      rows,
    });
  }

  if (mode === 'commit') {
    const body = (await req.json()) as { rows: ParsedCustomerRow[] };
    const validRows = body.rows.filter((r) => r.errors.length === 0);

    const created = await prisma.$transaction(
      validRows.map((r) =>
        prisma.customer.create({
          data: {
            code: r.code,
            type: r.type,
            name: r.name,
            contactName: r.contactName,
            taxId: r.taxId || null,
            address: r.address,
            province: r.province,
            postalCode: r.postalCode,
            phone: r.phone,
            email: r.email,
            creditTermDays: r.creditTermDays,
            defaultDiscountPercent: r.defaultDiscountPercent,
            createdById: user.id,
          },
        }),
      ),
    );

    await writeAuditLog({
      userId: user.id,
      action: 'IMPORT',
      entityType: 'Customer',
      entityId: 'BULK',
      newValue: { count: created.length },
    });

    return NextResponse.json({ imported: created.length });
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}
