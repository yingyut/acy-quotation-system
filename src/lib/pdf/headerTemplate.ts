import type { QuotationPrintData, InvoicePrintData, DeliveryNotePrintData, CopyType } from '@/lib/pdf/types';
import { COPY_LABELS } from '@/lib/pdf/types';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SHARED_STYLE = `
  .h-wrap { width: 100%; font-family: 'Sarabun', sans-serif; font-size: 8.5px; color: #1a1a1a; padding: 0 12mm; box-sizing: border-box; }
  .h-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #999; padding-bottom: 4px; }
  .h-company { display: flex; align-items: flex-start; gap: 8px; max-width: 62%; }
  .h-company img { height: 38px; width: 38px; object-fit: contain; }
  .h-name-th { font-weight: bold; font-size: 1.2em; }
  .h-name-en { color: #333; }
  .h-meta { color: #333; line-height: 1.4; margin-top: 1px; }
  .h-taxid { color: #333; margin-top: 2px; }
  .h-doc { text-align: right; }
  .h-title { font-weight: bold; font-size: 1.25em; margin-bottom: 2px; }
  .h-badge { display: inline-block; margin-bottom: 3px; padding: 0 5px; border: 1px solid #666; border-radius: 3px; font-size: 0.9em; }
  .h-table { margin-left: auto; border-collapse: collapse; font-size: 0.9em; }
  .h-table td { border: 1px solid #ccc; padding: 1px 6px; text-align: left; white-space: nowrap; }
  .h-table td.k { background: #f7f7f7; text-align: right; color: #333; }
  .h-sub { margin-top: 3px; font-size: 0.95em; color: #333; }
`;

interface RepeatingHeaderInput {
  docTitle: string;
  docNumberLabel: string;
  copyType: CopyType;
  customerName: string;
  company: QuotationPrintData['company'];
  dateLabel: string;
  dateValue: string;
  showCopyBadge: boolean;
}

/**
 * Puppeteer's page header/footer templates render in an isolated document
 * that cannot see the main page's stylesheets or web fonts - only inline
 * styles / a local <style> block and system fonts work here. We rely on
 * the `fonts-thai-tlwg` package installed in the Docker image so 'Sarabun'
 * falls back to a Thai-capable system font. This repeats on EVERY printed
 * page, independent of how the body content paginates (spec section 16:
 * logo / company name / document number / customer name on every page).
 * It mirrors the company's real paper quotation header layout so pages
 * 2+ look consistent with page 1 rather than showing a plain one-liner.
 *
 * Shared by all document types (Quotation, Invoice, Tax Invoice, Receipt,
 * Receipt/Tax Invoice, Delivery Note) so they render a consistent header -
 * only the title text and doc-number field differ per type.
 */
function buildHeaderHtml(input: RepeatingHeaderInput): string {
  const copyLabel = COPY_LABELS[input.copyType];
  const logo = input.company.logoDataUri ? `<img src="${input.company.logoDataUri}" alt="" />` : '';

  return `
    <style>${SHARED_STYLE}</style>
    <div class="h-wrap">
      <div class="h-row">
        <div class="h-company">
          ${logo}
          <div>
            <div class="h-name-th">${esc(input.company.nameTh)}</div>
            <div class="h-name-en">${esc(input.company.nameEn)}</div>
            <div class="h-meta">Tel: ${esc(input.company.phone)}</div>
            <div class="h-taxid">เลขประจำตัวผู้เสียภาษีอากร (TAX ID.) ${esc(input.company.taxId)}</div>
          </div>
        </div>
        <div class="h-doc">
          <div class="h-title">${esc(input.docTitle)}</div>
          ${input.showCopyBadge ? `<div class="h-badge">${esc(copyLabel.th)} / ${esc(copyLabel.en)}</div>` : ''}
          <table class="h-table">
            <tr>
              <td class="k">${esc(input.dateLabel)}</td><td>${esc(input.dateValue)}</td>
              <td class="k">เลขที่</td><td>${esc(input.docNumberLabel)}</td>
            </tr>
          </table>
        </div>
      </div>
      <div class="h-sub">ลูกค้า: ${esc(input.customerName)}</div>
    </div>
  `;
}

export function buildRepeatingHeaderHtml(data: QuotationPrintData): string {
  return buildHeaderHtml({
    docTitle: `${data.docTitle}/Quotation`,
    docNumberLabel: `${data.docNumber}${data.revisionNo > 0 ? ' Rev.' + data.revisionNo : ''}`,
    copyType: data.copyType,
    customerName: data.customer.name,
    company: data.company,
    dateLabel: 'วันที่',
    dateValue: data.quoteDate,
    showCopyBadge: true,
  });
}

export function buildInvoiceRepeatingHeaderHtml(data: InvoicePrintData): string {
  return buildHeaderHtml({
    docTitle: data.docTitle,
    docNumberLabel: data.docNumber,
    copyType: data.copyType,
    customerName: data.customer.name,
    company: data.company,
    dateLabel: 'วันที่',
    dateValue: data.issueDate,
    showCopyBadge: true,
  });
}

export function buildDeliveryNoteRepeatingHeaderHtml(data: DeliveryNotePrintData): string {
  return buildHeaderHtml({
    docTitle: `${data.docTitle}/Delivery Note`,
    docNumberLabel: data.docNumber,
    copyType: data.copyType,
    customerName: data.customer.name,
    company: data.company,
    dateLabel: 'วันที่ส่งของ',
    dateValue: data.deliveryDate,
    showCopyBadge: true,
  });
}
