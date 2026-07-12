import Decimal from 'decimal.js';
import { round2, toDecimal, type DecimalInput } from '@/lib/money';

export type CalcItemType = 'PRODUCT' | 'SERVICE' | 'TEXT' | 'HEADING' | 'LUMP_SUM';

export interface LineItemInput {
  itemType: CalcItemType;
  qty: DecimalInput;
  unitPrice: DecimalInput;
  unitCost: DecimalInput;
  discountPercent?: DecimalInput;
  discountAmount?: DecimalInput;
}

export interface LineItemResult {
  baseAmount: number;
  discountAmount: number;
  lineTotal: number;
  lineCost: number;
}

/** Item types that carry no monetary value on their own (headings / free-text notes). */
const NON_MONETARY_TYPES: CalcItemType[] = ['TEXT', 'HEADING'];

export function calcLineItem(input: LineItemInput): LineItemResult {
  if (NON_MONETARY_TYPES.includes(input.itemType)) {
    return { baseAmount: 0, discountAmount: 0, lineTotal: 0, lineCost: 0 };
  }

  const qty = toDecimal(input.qty);
  const unitPrice = toDecimal(input.unitPrice);
  const unitCost = toDecimal(input.unitCost);
  const baseAmount = qty.times(unitPrice);

  const discountPercent = toDecimal(input.discountPercent ?? 0);
  let discountAmount = toDecimal(input.discountAmount ?? 0);
  if (discountPercent.greaterThan(0)) {
    discountAmount = baseAmount.times(discountPercent).dividedBy(100);
  }
  // Discount can never exceed the line's own base amount.
  if (discountAmount.greaterThan(baseAmount)) discountAmount = baseAmount;

  const lineTotal = baseAmount.minus(discountAmount);
  const lineCost = qty.times(unitCost);

  return {
    baseAmount: round2(baseAmount),
    discountAmount: round2(discountAmount),
    lineTotal: round2(lineTotal),
    lineCost: round2(lineCost),
  };
}

export interface QuotationTotalsInput {
  items: LineItemInput[];
  billDiscountPercent?: DecimalInput;
  billDiscountAmount?: DecimalInput;
  vatEnabled: boolean;
  vatRate: DecimalInput;
  whtEnabled: boolean;
  whtRate: DecimalInput;
}

export interface QuotationTotalsResult {
  subtotal: number;
  lineDiscountTotal: number;
  billDiscount: number;
  totalDiscount: number;
  amountAfterDiscount: number;
  vatAmount: number;
  whtAmount: number;
  netTotal: number;
  totalCost: number;
  totalProfit: number;
  gpPercent: number;
  markupPercent: number;
}

export function calcQuotationTotals(input: QuotationTotalsInput): QuotationTotalsResult {
  let subtotal = new Decimal(0);
  let lineDiscountTotal = new Decimal(0);
  let totalCost = new Decimal(0);

  for (const item of input.items) {
    const r = calcLineItem(item);
    subtotal = subtotal.plus(r.baseAmount);
    lineDiscountTotal = lineDiscountTotal.plus(r.discountAmount);
    totalCost = totalCost.plus(r.lineCost);
  }

  const afterLineDiscount = subtotal.minus(lineDiscountTotal);

  const billDiscountPercent = toDecimal(input.billDiscountPercent ?? 0);
  let billDiscount = toDecimal(input.billDiscountAmount ?? 0);
  if (billDiscountPercent.greaterThan(0)) {
    billDiscount = afterLineDiscount.times(billDiscountPercent).dividedBy(100);
  }
  if (billDiscount.greaterThan(afterLineDiscount)) billDiscount = afterLineDiscount;

  const totalDiscount = lineDiscountTotal.plus(billDiscount);
  const amountAfterDiscount = subtotal.minus(totalDiscount);

  const vatAmount = input.vatEnabled
    ? amountAfterDiscount.times(toDecimal(input.vatRate)).dividedBy(100)
    : new Decimal(0);

  const whtAmount = input.whtEnabled
    ? amountAfterDiscount.times(toDecimal(input.whtRate)).dividedBy(100)
    : new Decimal(0);

  const netTotal = amountAfterDiscount.plus(vatAmount).minus(whtAmount);

  // Profit is measured on the pre-VAT sale amount: VAT is a pass-through
  // tax collected on behalf of the Revenue Department, and WHT is a
  // deduction from the payment received, so neither affects gross profit.
  const totalProfit = amountAfterDiscount.minus(totalCost);
  const gpPercent = amountAfterDiscount.isZero()
    ? new Decimal(0)
    : totalProfit.dividedBy(amountAfterDiscount).times(100);
  const markupPercent = totalCost.isZero()
    ? new Decimal(0)
    : totalProfit.dividedBy(totalCost).times(100);

  return {
    subtotal: round2(subtotal),
    lineDiscountTotal: round2(lineDiscountTotal),
    billDiscount: round2(billDiscount),
    totalDiscount: round2(totalDiscount),
    amountAfterDiscount: round2(amountAfterDiscount),
    vatAmount: round2(vatAmount),
    whtAmount: round2(whtAmount),
    netTotal: round2(netTotal),
    totalCost: round2(totalCost),
    totalProfit: round2(totalProfit),
    gpPercent: round2(gpPercent),
    markupPercent: round2(markupPercent),
  };
}

export interface ApprovalCheckInput {
  gpPercent: number;
  billDiscountPercent: number;
  maxLineDiscountPercent: number;
  minGpPercent: number;
  maxDiscountPercentWithoutApproval: number;
}

export interface ApprovalCheckResult {
  requiresApproval: boolean;
  reasons: string[];
}

/** Decides whether a quotation must go through Sales Manager approval
 *  before it can move out of Draft, per spec section 12. */
export function evaluateApprovalRequirement(input: ApprovalCheckInput): ApprovalCheckResult {
  const reasons: string[] = [];

  if (input.gpPercent < input.minGpPercent) {
    reasons.push(
      `GP ${input.gpPercent.toFixed(2)}% ต่ำกว่าเกณฑ์ขั้นต่ำ ${input.minGpPercent}%`,
    );
  }

  const maxDiscount = Math.max(input.billDiscountPercent, input.maxLineDiscountPercent);
  if (maxDiscount > input.maxDiscountPercentWithoutApproval) {
    reasons.push(
      `ส่วนลด ${maxDiscount.toFixed(2)}% เกินเกณฑ์ที่อนุมัติได้เอง ${input.maxDiscountPercentWithoutApproval}%`,
    );
  }

  return { requiresApproval: reasons.length > 0, reasons };
}
