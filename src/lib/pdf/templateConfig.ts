import { z } from 'zod';

/**
 * Full, structured Document Template configuration - the single source of
 * truth for how a printed document looks. Stored as validated JSON in
 * `document_templates.config`. Every print/PDF surface (Quotation,
 * Invoice, Tax Invoice, Receipt, Receipt/Tax Invoice, Delivery Note)
 * renders through the same block components driven by this config -
 * nothing about layout is hard-coded per document type anymore.
 */

export const ITEM_COLUMN_KEYS = [
  'no',
  'code',
  'name',
  'qty',
  'unit',
  'unitPrice',
  'discount',
  'lineTotal',
] as const;
export type ItemColumnKey = (typeof ITEM_COLUMN_KEYS)[number];

const itemColumnSchema = z.object({
  key: z.enum(ITEM_COLUMN_KEYS),
  label: z.string().min(1),
  visible: z.boolean(),
  widthMm: z.number().min(5).max(120),
  align: z.enum(['left', 'center', 'right']),
});

const generalSchema = z.object({
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  marginTopMm: z.number().min(5).max(60).default(26),
  marginRightMm: z.number().min(5).max(40).default(10),
  marginBottomMm: z.number().min(5).max(40).default(10),
  marginLeftMm: z.number().min(5).max(40).default(10),
  fontFamily: z.string().min(1).default('Sarabun'),
  fontSizeBase: z.number().min(7).max(16).default(10),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0F4C81'),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#999999'),
  borderWidthPx: z.number().min(0).max(4).default(1),
});

const headerSchema = z.object({
  showLogo: z.boolean().default(true),
  logoWidthMm: z.number().min(5).max(40).default(12),
  logoHeightMm: z.number().min(5).max(40).default(12),
  logoPosition: z.enum(['LEFT', 'CENTER', 'RIGHT']).default('LEFT'),
  companyNameFontSizePt: z.number().min(8).max(24).default(12),
  showAddress: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showTaxId: z.boolean().default(true),
  repeatEveryPage: z.boolean().default(true),
  fullHeaderFirstPage: z.boolean().default(true),
  compactHeaderFollowingPages: z.boolean().default(true),
});

const customerSectionSchema = z.object({
  showContact: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showTaxId: z.boolean().default(true),
  showBranch: z.boolean().default(true),
  layout: z.enum(['1col', '2col']).default('2col'),
});

const itemTableSchema = z.object({
  columns: z.array(itemColumnSchema).min(1),
  showProductImage: z.boolean().default(false),
  productImageMode: z.enum(['NONE', 'SMALL', 'MEDIUM', 'FULL']).default('NONE'),
  showSpec: z.boolean().default(false),
  specMode: z.enum(['NONE', 'BRIEF', 'FULL']).default('NONE'),
  verticalBorder: z.boolean().default(true),
  horizontalBorder: z.boolean().default(true),
  rowPaddingPx: z.number().min(0).max(20).default(5),
  fontSizePt: z.number().min(6).max(14).default(9),
  headerBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F2F2F2'),
  repeatHeaderEveryPage: z.boolean().default(true),
});

const summarySchema = z.object({
  showSubtotal: z.boolean().default(true),
  showDiscount: z.boolean().default(true),
  showVat: z.boolean().default(true),
  showWht: z.boolean().default(true),
  showGrandTotal: z.boolean().default(true),
  showAmountWords: z.boolean().default(true),
  position: z.enum(['left', 'right']).default('right'),
  widthMm: z.number().min(50).max(120).default(78),
});

const signatureBoxSchema = z.object({
  label: z.string().min(1),
  showSignatureImage: z.boolean().default(false),
  showStamp: z.boolean().default(false),
  showDateLine: z.boolean().default(true),
});

const signatureSchema = z.object({
  boxes: z.array(signatureBoxSchema).min(0).max(4).default([
    { label: 'ผู้อนุมัติการสั่งซื้อ/ผู้มีอำนาจลงนามแทนบริษัทฯ', showSignatureImage: false, showStamp: false, showDateLine: true },
    { label: 'ขอแสดงความนับถือ', showSignatureImage: true, showStamp: true, showDateLine: true },
  ]),
  heightMm: z.number().min(15).max(60).default(28),
});

const sectionsSchema = z.object({
  showValidity: z.boolean().default(true),
  showProjectSection: z.boolean().default(true),
  showNotes: z.boolean().default(true),
  showBankSection: z.boolean().default(true),
  showPageNumber: z.boolean().default(true),
  showFooterText: z.boolean().default(true),
});

export const documentTemplateConfigSchema = z.object({
  general: generalSchema,
  header: headerSchema,
  customer: customerSectionSchema,
  itemTable: itemTableSchema,
  summary: summarySchema,
  signature: signatureSchema,
  sections: sectionsSchema,
});

export type DocumentTemplateConfig = z.infer<typeof documentTemplateConfigSchema>;
export type ItemColumnConfig = z.infer<typeof itemColumnSchema>;

export const DEFAULT_ITEM_COLUMNS: ItemColumnConfig[] = [
  { key: 'no', label: 'ลำดับ', visible: true, widthMm: 10, align: 'right' },
  { key: 'code', label: 'รหัสสินค้า', visible: true, widthMm: 22, align: 'left' },
  { key: 'name', label: 'รายละเอียดสินค้า/บริการ', visible: true, widthMm: 66, align: 'left' },
  { key: 'qty', label: 'จำนวน', visible: true, widthMm: 16, align: 'right' },
  { key: 'unit', label: 'หน่วย', visible: true, widthMm: 14, align: 'center' },
  { key: 'unitPrice', label: 'ราคา/หน่วย', visible: true, widthMm: 22, align: 'right' },
  { key: 'discount', label: 'ส่วนลด', visible: true, widthMm: 16, align: 'right' },
  { key: 'lineTotal', label: 'รวมเงิน', visible: true, widthMm: 24, align: 'right' },
];

export function buildDefaultTemplateConfig(): DocumentTemplateConfig {
  return documentTemplateConfigSchema.parse({
    general: {},
    header: {},
    customer: {},
    itemTable: { columns: DEFAULT_ITEM_COLUMNS },
    summary: {},
    signature: {},
    sections: {},
  });
}

/** Parses+validates a template's stored JSON config, falling back to
 *  defaults for anything missing/invalid rather than throwing - a
 *  template that fails to fully validate should still render something
 *  reasonable instead of breaking PDF export. */
export function parseTemplateConfig(raw: unknown): DocumentTemplateConfig {
  const result = documentTemplateConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  return buildDefaultTemplateConfig();
}
