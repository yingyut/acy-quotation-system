// Integration test data (spec section 30 / PDF template acceptance
// criteria): creates quotations sized to exercise PDF pagination edge
// cases - a short 1-page document and a longer 2-page document with
// multi-line specifications. Combined with the 41-item quotation created
// by prisma/seed.ts (seedMultiPagePdfTestQuotation), this covers the
// "1-page / 2-page / many-page" test matrix requested for the print
// template. Run: docker compose exec app npx tsx scripts/seed-pdf-test-cases.ts
import { PrismaClient } from '@prisma/client';
import { calcQuotationTotals } from '../src/lib/calc';
import { bahtText, round2 } from '../src/lib/money';
import { generateDocNumber } from '../src/lib/docNumber';

const prisma = new PrismaClient();

interface TestItem {
  itemType: 'HEADING' | 'PRODUCT' | 'SERVICE' | 'TEXT' | 'LUMP_SUM';
  code?: string;
  name: string;
  description?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  unitCost: number;
}

async function createQuotation(projectName: string, title: string, items: TestItem[]) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { deletedAt: null } });

  const totals = calcQuotationTotals({
    items: items.map((i) => ({ itemType: i.itemType, qty: i.qty, unitPrice: i.unitPrice, unitCost: i.unitCost })),
    vatEnabled: true,
    vatRate: 7,
    whtEnabled: false,
    whtRate: 0,
  });

  const docNumber = await generateDocNumber('QUOTATION');

  const quotation = await prisma.quotation.create({
    data: {
      docNumber,
      customerId: customer.id,
      contactName: customer.contactName,
      projectName,
      title,
      deliveryTerms: '7-14 วันทำการหลังยืนยันคำสั่งซื้อ',
      creditTermDays: 30,
      paymentTerms: 'ชำระเงิน 50% เมื่อสั่งซื้อ ส่วนที่เหลือชำระเมื่องานแล้วเสร็จ',
      vatEnabled: true,
      vatRate: 7,
      preparedById: admin.id,
      status: 'APPROVED',
      approvedById: admin.id,
      approvedAt: new Date(),
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatAmount: totals.vatAmount,
      whtAmount: totals.whtAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      gpPercent: totals.gpPercent,
      markupPercent: totals.markupPercent,
      items: {
        create: items.map((i, idx) => {
          const lineTotal = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitPrice);
          const lineCost = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitCost);
          return {
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            lineTotal,
            lineCost,
          };
        }),
      },
    },
  });

  console.log(`${quotation.docNumber} | ${quotation.id} | ${projectName}`);
  return quotation.id;
}

async function main() {
  const existing = await prisma.quotation.findFirst({ where: { projectName: 'ทดสอบ PDF 1 หน้า' } });
  if (existing) {
    console.log('PDF test cases already seeded, skipping.');
    return;
  }

  // Test case 1: 1-page, 3-4 items
  await createQuotation('ทดสอบ PDF 1 หน้า', 'ใบเสนอราคาสั้น 4 รายการ', [
    { itemType: 'PRODUCT', code: 'NET-AP01', name: 'Access Point Wi-Fi 6', qty: 2, unit: 'เครื่อง', unitPrice: 7500, unitCost: 5200 },
    { itemType: 'PRODUCT', code: 'NET-CAB6', name: 'สาย LAN Cat6 UTP', qty: 1, unit: 'กล่อง', unitPrice: 2500, unitCost: 1800 },
    { itemType: 'SERVICE', code: 'SRV-INSTALL', name: 'ค่าแรงติดตั้ง', qty: 1, unit: 'งาน', unitPrice: 3000, unitCost: 1500 },
    { itemType: 'TEXT', name: 'รวมค่าเดินทางแล้ว ไม่มีค่าใช้จ่ายเพิ่มเติม', qty: 0, unitPrice: 0, unitCost: 0 },
  ]);

  // Test case 2: 2-page, with multi-line long descriptions (Full Spec)
  const test2Items: TestItem[] = [
    { itemType: 'HEADING', name: 'งานติดตั้งระบบกล้องวงจรปิด (CCTV Installation)', qty: 0, unitPrice: 0, unitCost: 0 },
  ];
  for (let i = 1; i <= 10; i++) {
    test2Items.push({
      itemType: 'PRODUCT',
      code: `CAM-${String(i).padStart(3, '0')}`,
      name: `กล้องวงจรปิด IP Camera 4MP รุ่นทดสอบที่ ${i}`,
      description:
        'สเปกเต็ม: ความละเอียด 4MP, เลนส์ 2.8mm, มองเห็นกลางคืนสูงสุด 30 เมตร, ป้องกันน้ำและฝุ่นมาตรฐาน IP67, ' +
        'รองรับ Power over Ethernet (PoE), บันทึกภาพเคลื่อนไหวอัตโนมัติ, รับประกันสินค้า 2 ปีเต็มตามเงื่อนไขศูนย์บริการ',
      qty: 2,
      unit: 'ตัว',
      unitPrice: 3200,
      unitCost: 2100,
    });
  }
  await createQuotation('ทดสอบ PDF 2 หน้า', 'ใบเสนอราคางานติดตั้งกล้องวงจรปิดพร้อม Spec เต็ม', test2Items);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
