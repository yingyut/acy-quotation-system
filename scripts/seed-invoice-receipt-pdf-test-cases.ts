// Integration test data (spec section 30 / PDF template acceptance
// criteria): creates Invoices + matching Receipts sized to exercise PDF
// pagination edge cases for the Invoice/Receipt templates - a short
// 1-page document and a longer 2-page document with multi-line
// descriptions. Mirrors scripts/seed-pdf-test-cases.ts (which does the
// same for Quotations), but creates the Invoice/Payment/Receipt records
// directly via Prisma rather than going through the full
// Quotation -> SalesOrder -> DeliveryNote -> Invoice workflow (matching
// the pattern used by prisma/seed.ts's seedSampleDocumentChain, minus the
// upstream documents). Combined with the existing 42-item
// INV-ACY-2026-0001..0006 / RC-ACY-2026-0001..0006 fixtures, this covers
// the "1-page / 2-page / many-page" test matrix for Invoice and Receipt.
// Run: docker compose exec app npx tsx scripts/seed-invoice-receipt-pdf-test-cases.ts
import { PrismaClient } from '@prisma/client';
import { calcQuotationTotals } from '../src/lib/calc';
import { bahtText, round2 } from '../src/lib/money';
import { generateDocNumber } from '../src/lib/docNumber';

const prisma = new PrismaClient();

const IDEMPOTENCY_NOTE_1PAGE = 'PDF_TEST_CASE:INVOICE_1PAGE';
const IDEMPOTENCY_NOTE_2PAGE = 'PDF_TEST_CASE:INVOICE_2PAGE';

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

async function createInvoiceWithReceipt(note: string, items: TestItem[]) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { deletedAt: null } });

  const totals = calcQuotationTotals({
    items: items.map((i) => ({ itemType: i.itemType, qty: i.qty, unitPrice: i.unitPrice, unitCost: i.unitCost })),
    vatEnabled: true,
    vatRate: 7,
    whtEnabled: false,
    whtRate: 0,
  });

  const invDocNumber = await generateDocNumber('INVOICE');
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + (customer.creditTermDays ?? 30));

  const invoice = await prisma.invoice.create({
    data: {
      docNumber: invDocNumber,
      docType: 'INVOICE',
      customerId: customer.id,
      issueDate,
      dueDate,
      note,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      amountAfterDiscount: totals.amountAfterDiscount,
      vatRate: 7,
      vatAmount: totals.vatAmount,
      whtAmount: totals.whtAmount,
      netTotal: totals.netTotal,
      amountInWordsTh: bahtText(totals.netTotal),
      paidAmount: totals.netTotal,
      balanceAmount: 0,
      status: 'PAID',
      createdById: admin.id,
      items: {
        create: items.map((i, idx) => {
          const lineTotal = i.itemType === 'TEXT' || i.itemType === 'HEADING' ? 0 : round2(i.qty * i.unitPrice);
          return {
            sortOrder: idx,
            itemType: i.itemType,
            code: i.code,
            name: i.name,
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            lineTotal,
          };
        }),
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      paidDate: issueDate,
      amount: totals.netTotal,
      method: 'TRANSFER',
      refNumber: 'TRF-PDFTEST-0001',
      bankName: 'ธนาคารกสิกรไทย',
      recordedById: admin.id,
    },
  });

  const receiptDocNumber = await generateDocNumber('RECEIPT');
  const receipt = await prisma.receipt.create({
    data: {
      docNumber: receiptDocNumber,
      invoiceId: invoice.id,
      paymentId: payment.id,
      receiptDate: payment.paidDate,
      amount: totals.netTotal,
      note,
    },
  });

  console.log(`Invoice ${invoice.docNumber} | ${invoice.id} | items=${items.length}`);
  console.log(`Receipt ${receipt.docNumber} | ${receipt.id}`);
  return { invoice, receipt };
}

async function main() {
  const existing = await prisma.invoice.findFirst({ where: { note: IDEMPOTENCY_NOTE_1PAGE } });
  if (existing) {
    console.log('Invoice/Receipt PDF test cases already seeded, skipping.');
    return;
  }

  // Test case 1: 1-page, 4 items
  await createInvoiceWithReceipt(IDEMPOTENCY_NOTE_1PAGE, [
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
  await createInvoiceWithReceipt(IDEMPOTENCY_NOTE_2PAGE, test2Items);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
