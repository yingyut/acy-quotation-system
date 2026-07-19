import type { DocumentTemplateConfig } from '@/lib/pdf/templateConfig';

/**
 * Builds the single <style> block shared by every block component, the
 * client-side live Admin preview, and the final server-rendered PDF page -
 * all driven by the same DocumentTemplateConfig so a color/font/margin
 * change made in the Template Editor renders identically everywhere.
 */
export function buildPrintCss(config: DocumentTemplateConfig): string {
  const { general, itemTable } = config;
  return `
    @import url('/fonts/sarabun.css');
    html, body { background: #fff !important; margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    .print-root {
      font-family: '${general.fontFamily}', sans-serif;
      font-size: ${general.fontSizeBase}pt;
      color: #1a1a1a;
    }
    .a4-page {
      position: relative;
      width: 210mm;
      height: 297mm;
      padding: ${general.marginTopMm}mm ${general.marginRightMm}mm ${general.marginBottomMm}mm ${general.marginLeftMm}mm;
      background: #fff;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .a4-page.landscape { width: 297mm; height: 210mm; }
    .a4-page:last-child { page-break-after: auto; }
    table.doc { width: 100%; border-collapse: collapse; table-layout: fixed; }
    tr { page-break-inside: avoid; }
    .header-block { padding-bottom: 6px; border-bottom: 1px solid ${general.borderColor}; margin-bottom: 6px; }
    .header-full-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-company { display: flex; align-items: flex-start; gap: 8px; max-width: 68%; }
    .header-company img.logo { object-fit: contain; flex-shrink: 0; }
    .header-name-th { font-weight: bold; font-size: ${config.header.companyNameFontSizePt}pt; color: ${general.primaryColor}; }
    .header-name-en { color: #333; }
    .header-meta-line { color: #333; line-height: 1.4; margin-top: 1px; font-size: 0.85em; }
    .header-contact-line { white-space: nowrap; }
    .header-doc { text-align: right; }
    .header-title-th { font-weight: bold; font-size: 1.3em; color: ${general.primaryColor}; }
    .header-title-en { font-size: 0.95em; color: #444; }
    .header-badge { display: inline-block; margin: 3px 0; padding: 0 5px; border: 1px solid #666; border-radius: 3px; font-size: 0.8em; }
    .header-compact { display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; border-bottom: 1px solid ${general.borderColor}; padding-bottom: 4px; margin-bottom: 6px; }
    .info-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .info-row.col1 { flex-direction: column; }
    .customer-block { display: flex; flex-direction: column; justify-content: center; flex: 1.4; border: 1px solid ${general.borderColor}; border-radius: 2px; padding: 8px 10px; font-size: 0.88em; }
    .subject-block { display: flex; flex-direction: column; justify-content: center; flex: 1; border: 1px solid ${general.borderColor}; border-radius: 2px; padding: 8px 10px; font-size: 0.88em; }
    .subject-block-full { border: 1px solid ${general.borderColor}; border-radius: 2px; padding: 8px 10px; font-size: 0.88em; margin-top: 8px; }
    .cust-row { display: flex; padding: 2.5px 0; line-height: 1.45; }
    .cust-label { width: 150px; flex-shrink: 0; font-weight: 700; }
    .cust-value { flex: 1; }
    .doc-meta-col { display: flex; flex-direction: column; justify-content: center; gap: 6px; flex: 1; }
    .doc-meta-stack { width: 100%; border: 1px solid ${general.borderColor}; border-collapse: collapse; table-layout: fixed; font-size: 0.82em; }
    .doc-meta-stack th { background: #f7f7f7; color: #333; font-weight: 700; padding: 3px 4px; border: 1px solid #ccc; text-align: center; }
    .doc-meta-stack td { padding: 3px 4px; border: 1px solid #ccc; text-align: center; }
    .cust-check { margin-left: 14px; white-space: nowrap; }
    .cust-check-box { font-size: 0.75em; }
    th.col-head {
      background: ${itemTable.headerBackground};
      color: #1a1a1a;
      font-size: ${itemTable.fontSizePt}pt;
      font-weight: 700;
      padding: ${itemTable.rowPaddingPx}px 6px;
      text-align: left;
      white-space: nowrap;
      ${itemTable.horizontalBorder ? `border-top: ${general.borderWidthPx}px solid ${general.borderColor}; border-bottom: ${general.borderWidthPx}px solid ${general.borderColor};` : ''}
      ${itemTable.verticalBorder ? `border-left: ${general.borderWidthPx}px solid ${general.borderColor}; border-right: ${general.borderWidthPx}px solid ${general.borderColor};` : ''}
    }
    th.col-head.align-right, td.align-right { text-align: right; }
    th.col-head.align-center, td.align-center { text-align: center; }
    td.item-cell {
      padding: ${itemTable.rowPaddingPx}px 6px;
      font-size: ${itemTable.fontSizePt}pt;
      vertical-align: top;
      ${itemTable.horizontalBorder ? `border-bottom: 1px solid #eee;` : ''}
      ${itemTable.verticalBorder ? `border-left: ${general.borderWidthPx}px solid ${general.borderColor}; border-right: ${general.borderWidthPx}px solid ${general.borderColor};` : ''}
    }
    tr.heading-row td { background: #f3f4f6; font-weight: 700; color: #1a1a1a; text-decoration: underline; }
    tr.text-row td { color: #444; font-style: italic; }
    .item-name { font-weight: 600; }
    .item-desc { color: #666; font-size: 0.92em; white-space: pre-line; }
    .item-img { display: block; margin-top: 3px; object-fit: contain; }
    .totals-block { page-break-inside: avoid; }
    .totals-wrap { display: flex; align-items: flex-start; gap: 12px; margin-top: 10px; }
    .totals-wrap.pos-left { flex-direction: row-reverse; }
    .left-col { flex: 1; min-width: 0; }
    .amount-words-band { background: #f2f2f2; padding: 5px 10px; font-size: 0.88em; margin-bottom: 8px; }
    .amount-words-band .label { font-weight: 700; margin-right: 10px; }
    .totals-table { flex-shrink: 0; font-size: 0.9em; border: 1px solid ${general.borderColor}; border-collapse: collapse; }
    .totals-table td { padding: 4px 8px; border: 1px solid #ccc; }
    .totals-table tr.grand-total td { font-weight: 700; font-size: 1.05em; }
    .terms-block { font-size: 0.85em; color: #444; white-space: pre-line; }
    .terms-title { font-weight: 700; margin-bottom: 2px; }
    .bank-block { font-size: 0.85em; color: #444; margin-top: 6px; }
    .signature-block { page-break-inside: avoid; margin-top: 30px; display: flex; justify-content: space-between; gap: 12px; }
    .signature-col { flex: 1; text-align: center; font-size: 0.85em; border: 1px solid ${general.borderColor}; border-radius: 2px; padding: 8px 10px 12px; display: flex; flex-direction: column; justify-content: flex-end; }
    .signature-title { font-weight: 700; margin-bottom: 30px; }
    .signature-img { height: 45px; object-fit: contain; margin-bottom: 2px; }
    .signature-img-placeholder { height: 45px; }
    .signature-line { border-top: 1px solid #999; margin-top: 4px; padding-top: 4px; }
    .signature-date { color: #555; font-size: 0.92em; margin-top: 2px; }
    .stamp-img { height: 55px; opacity: 0.9; margin-top: -20px; }
    .footer-text { text-align: center; font-size: 0.78em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 6px; }
    .page-footer-num { text-align: center; font-size: 0.75em; color: #999; margin-top: 6px; }
    .measure-scratch { position: absolute; left: -9999px; top: 0; visibility: hidden; }
  `;
}
