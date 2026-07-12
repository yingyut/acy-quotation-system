import ExcelJS from 'exceljs';
import type { Customer } from '@prisma/client';

export const CUSTOMER_COLUMNS = [
  { key: 'code', header: 'รหัสลูกค้า*', width: 14 },
  { key: 'type', header: 'ประเภท (COMPANY/INDIVIDUAL)', width: 20 },
  { key: 'name', header: 'ชื่อลูกค้า*', width: 30 },
  { key: 'contactName', header: 'ผู้ติดต่อ', width: 20 },
  { key: 'taxId', header: 'เลขผู้เสียภาษี', width: 16 },
  { key: 'address', header: 'ที่อยู่', width: 30 },
  { key: 'province', header: 'จังหวัด', width: 14 },
  { key: 'postalCode', header: 'รหัสไปรษณีย์', width: 12 },
  { key: 'phone', header: 'เบอร์โทร', width: 14 },
  { key: 'email', header: 'อีเมล', width: 20 },
  { key: 'creditTermDays', header: 'เครดิตเทอม (วัน)', width: 14 },
  { key: 'defaultDiscountPercent', header: 'ส่วนลด (%)', width: 12 },
] as const;

export async function buildCustomerTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.columns = CUSTOMER_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    code: 'CUS-0001',
    type: 'COMPANY',
    name: 'บริษัท ตัวอย่าง จำกัด',
    contactName: 'คุณสมชาย',
    taxId: '0123456789012',
    address: '111 ถนนตัวอย่าง',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110',
    phone: '02-123-4567',
    email: 'sample@example.com',
    creditTermDays: 30,
    defaultDiscountPercent: 0,
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function exportCustomers(customers: Customer[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.columns = CUSTOMER_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  for (const c of customers) {
    sheet.addRow({
      code: c.code,
      type: c.type,
      name: c.name,
      contactName: c.contactName,
      taxId: c.taxId,
      address: c.address,
      province: c.province,
      postalCode: c.postalCode,
      phone: c.phone,
      email: c.email,
      creditTermDays: c.creditTermDays,
      defaultDiscountPercent: Number(c.defaultDiscountPercent),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export interface ParsedCustomerRow {
  row: number;
  code: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  name: string;
  contactName?: string;
  taxId?: string;
  address?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  creditTermDays: number;
  defaultDiscountPercent: number;
  errors: string[];
}

export async function parseCustomerImport(buffer: Buffer): Promise<ParsedCustomerRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  const results: ParsedCustomerRow[] = [];

  const seenCodes = new Set<string>();
  const seenTaxIds = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const get = (idx: number) => String(row.getCell(idx).value ?? '').trim();
    const code = get(1);
    const type = (get(2).toUpperCase() || 'COMPANY') as 'COMPANY' | 'INDIVIDUAL';
    const name = get(3);
    if (!code && !name) return; // skip fully empty rows

    const errors: string[] = [];
    if (!code) errors.push('ไม่มีรหัสลูกค้า');
    if (!name) errors.push('ไม่มีชื่อลูกค้า');
    if (!['COMPANY', 'INDIVIDUAL'].includes(type)) errors.push('ประเภทลูกค้าต้องเป็น COMPANY หรือ INDIVIDUAL');
    if (code && seenCodes.has(code)) errors.push('รหัสลูกค้าซ้ำในไฟล์');
    if (code) seenCodes.add(code);
    const taxId = get(5) || undefined;
    if (taxId && seenTaxIds.has(taxId)) errors.push('เลขผู้เสียภาษีซ้ำในไฟล์');
    if (taxId) seenTaxIds.add(taxId);

    results.push({
      row: rowNumber,
      code,
      type,
      name,
      contactName: get(4) || undefined,
      taxId,
      address: get(6) || undefined,
      province: get(7) || undefined,
      postalCode: get(8) || undefined,
      phone: get(9) || undefined,
      email: get(10) || undefined,
      creditTermDays: Number(get(11)) || 0,
      defaultDiscountPercent: Number(get(12)) || 0,
      errors,
    });
  });

  return results;
}
