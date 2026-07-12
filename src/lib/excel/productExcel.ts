import ExcelJS from 'exceljs';
import type { Product } from '@prisma/client';

export const PRODUCT_COLUMNS = [
  { key: 'code', header: 'รหัสสินค้า*', width: 14 },
  { key: 'sku', header: 'SKU', width: 14 },
  { key: 'name', header: 'ชื่อสินค้า*', width: 30 },
  { key: 'nameEn', header: 'ชื่อภาษาอังกฤษ', width: 24 },
  { key: 'brand', header: 'ยี่ห้อ', width: 16 },
  { key: 'model', header: 'รุ่น', width: 16 },
  { key: 'unit', header: 'หน่วยนับ', width: 10 },
  { key: 'costPrice', header: 'ราคาทุน', width: 12 },
  { key: 'sellPrice', header: 'ราคาขาย*', width: 12 },
] as const;

export async function buildProductTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.columns = PRODUCT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    code: 'PRD-0001',
    sku: 'SKU-0001',
    name: 'สายแลน Cat6 305m',
    nameEn: 'Cat6 UTP Cable 305m',
    brand: 'Link',
    model: 'US-9106',
    unit: 'กล่อง',
    costPrice: 1800,
    sellPrice: 2400,
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function exportProducts(products: Product[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.columns = PRODUCT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  for (const p of products) {
    sheet.addRow({
      code: p.code,
      sku: p.sku,
      name: p.name,
      nameEn: p.nameEn,
      brand: p.brand,
      model: p.model,
      unit: p.unit,
      costPrice: Number(p.costPrice),
      sellPrice: Number(p.sellPrice),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export interface ParsedProductRow {
  row: number;
  code: string;
  sku?: string;
  name: string;
  nameEn?: string;
  brand?: string;
  model?: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  errors: string[];
}

export async function parseProductImport(buffer: Buffer): Promise<ParsedProductRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  const results: ParsedProductRow[] = [];
  const seenCodes = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (idx: number) => String(row.getCell(idx).value ?? '').trim();
    const code = get(1);
    const name = get(3);
    if (!code && !name) return;

    const errors: string[] = [];
    if (!code) errors.push('ไม่มีรหัสสินค้า');
    if (!name) errors.push('ไม่มีชื่อสินค้า');
    if (code && seenCodes.has(code)) errors.push('รหัสสินค้าซ้ำในไฟล์');
    if (code) seenCodes.add(code);

    const sellPrice = Number(get(9)) || 0;
    if (sellPrice <= 0) errors.push('ราคาขายต้องมากกว่า 0');

    results.push({
      row: rowNumber,
      code,
      sku: get(2) || undefined,
      name,
      nameEn: get(4) || undefined,
      brand: get(5) || undefined,
      model: get(6) || undefined,
      unit: get(7) || 'ชิ้น',
      costPrice: Number(get(8)) || 0,
      sellPrice,
      errors,
    });
  });

  return results;
}
