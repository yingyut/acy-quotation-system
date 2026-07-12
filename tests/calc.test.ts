import { describe, it, expect } from 'vitest';
import { calcLineItem, calcQuotationTotals, evaluateApprovalRequirement } from '@/lib/calc';
import { bahtText, round2 } from '@/lib/money';

describe('calcLineItem', () => {
  it('computes base amount, discount and line total for a product row', () => {
    const r = calcLineItem({
      itemType: 'PRODUCT',
      qty: 3,
      unitPrice: 1500,
      unitCost: 900,
      discountPercent: 10,
    });
    expect(r.baseAmount).toBe(4500);
    expect(r.discountAmount).toBe(450);
    expect(r.lineTotal).toBe(4050);
    expect(r.lineCost).toBe(2700);
  });

  it('supports a flat discount amount instead of percent', () => {
    const r = calcLineItem({
      itemType: 'SERVICE',
      qty: 1,
      unitPrice: 2000,
      unitCost: 500,
      discountAmount: 200,
    });
    expect(r.lineTotal).toBe(1800);
  });

  it('never lets discount exceed the line amount', () => {
    const r = calcLineItem({
      itemType: 'PRODUCT',
      qty: 1,
      unitPrice: 100,
      unitCost: 10,
      discountAmount: 999,
    });
    expect(r.lineTotal).toBe(0);
  });

  it('text and heading rows carry no monetary value', () => {
    const text = calcLineItem({ itemType: 'TEXT', qty: 1, unitPrice: 500, unitCost: 100 });
    expect(text.lineTotal).toBe(0);
    expect(text.lineCost).toBe(0);

    const heading = calcLineItem({ itemType: 'HEADING', qty: 0, unitPrice: 0, unitCost: 0 });
    expect(heading.lineTotal).toBe(0);
  });
});

describe('calcQuotationTotals', () => {
  it('matches the worked example: cost/profit/GP/discount/VAT/net', () => {
    const totals = calcQuotationTotals({
      items: [
        { itemType: 'PRODUCT', qty: 2, unitPrice: 10000, unitCost: 7000 }, // 20000 / cost 14000
        { itemType: 'SERVICE', qty: 1, unitPrice: 5000, unitCost: 2000, discountPercent: 10 }, // 4500 / cost 2000
        { itemType: 'TEXT', qty: 1, unitPrice: 0, unitCost: 0 },
      ],
      billDiscountAmount: 500,
      vatEnabled: true,
      vatRate: 7,
      whtEnabled: true,
      whtRate: 3,
    });

    expect(totals.subtotal).toBe(25000); // 20000 + 5000
    expect(totals.lineDiscountTotal).toBe(500); // 10% of 5000
    expect(totals.billDiscount).toBe(500);
    expect(totals.totalDiscount).toBe(1000);
    expect(totals.amountAfterDiscount).toBe(24000);
    expect(totals.vatAmount).toBe(1680); // 7% of 24000
    expect(totals.whtAmount).toBe(720); // 3% of 24000
    expect(totals.netTotal).toBe(round2(24000 + 1680 - 720));
    expect(totals.totalCost).toBe(16000); // 14000 + 2000
    expect(totals.totalProfit).toBe(8000); // 24000 - 16000
    expect(totals.gpPercent).toBe(round2((8000 / 24000) * 100));
    expect(totals.markupPercent).toBe(round2((8000 / 16000) * 100));
  });

  it('handles a quotation with no VAT/WHT and zero cost gracefully', () => {
    const totals = calcQuotationTotals({
      items: [{ itemType: 'PRODUCT', qty: 1, unitPrice: 1000, unitCost: 0 }],
      vatEnabled: false,
      vatRate: 7,
      whtEnabled: false,
      whtRate: 0,
    });
    expect(totals.vatAmount).toBe(0);
    expect(totals.whtAmount).toBe(0);
    expect(totals.netTotal).toBe(1000);
    expect(totals.markupPercent).toBe(0); // avoid divide-by-zero
  });
});

describe('evaluateApprovalRequirement', () => {
  it('flags low GP for approval', () => {
    const result = evaluateApprovalRequirement({
      gpPercent: 8,
      billDiscountPercent: 5,
      maxLineDiscountPercent: 5,
      minGpPercent: 15,
      maxDiscountPercentWithoutApproval: 20,
    });
    expect(result.requiresApproval).toBe(true);
    expect(result.reasons.length).toBe(1);
  });

  it('flags excessive discount for approval', () => {
    const result = evaluateApprovalRequirement({
      gpPercent: 30,
      billDiscountPercent: 25,
      maxLineDiscountPercent: 10,
      minGpPercent: 15,
      maxDiscountPercentWithoutApproval: 20,
    });
    expect(result.requiresApproval).toBe(true);
  });

  it('does not require approval when within thresholds', () => {
    const result = evaluateApprovalRequirement({
      gpPercent: 25,
      billDiscountPercent: 5,
      maxLineDiscountPercent: 5,
      minGpPercent: 15,
      maxDiscountPercentWithoutApproval: 20,
    });
    expect(result.requiresApproval).toBe(false);
  });
});

describe('bahtText (Thai amount-in-words)', () => {
  it('converts whole numbers correctly', () => {
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน');
    expect(bahtText(1)).toBe('หนึ่งบาทถ้วน');
    expect(bahtText(11)).toBe('สิบเอ็ดบาทถ้วน');
    expect(bahtText(21)).toBe('ยี่สิบเอ็ดบาทถ้วน');
    expect(bahtText(100)).toBe('หนึ่งร้อยบาทถ้วน');
    expect(bahtText(1000000)).toBe('หนึ่งล้านบาทถ้วน');
  });

  it('handles satang (decimal) correctly', () => {
    expect(bahtText(1234.5)).toBe('หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์');
  });

  it('handles a realistic quotation total', () => {
    // 24,960.00 -> "สองหมื่นสี่พันเก้าร้อยหกสิบบาทถ้วน"
    expect(bahtText(24960)).toBe('สองหมื่นสี่พันเก้าร้อยหกสิบบาทถ้วน');
  });
});
