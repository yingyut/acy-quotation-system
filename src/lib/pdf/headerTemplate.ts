import type { QuotationPrintData, InvoicePrintData, CopyType } from '@/lib/pdf/types';
import { COPY_LABELS } from '@/lib/pdf/types';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Puppeteer's page header/footer templates render in an isolated document
 * that cannot see the main page's stylesheets or web fonts - only inline
 * styles and system fonts work here. We rely on the `fonts-thai-tlwg`
 * package installed in the Docker image so generic `sans-serif` still
 * resolves to a Thai-capable font. This repeats on EVERY printed page,
 * independent of how the body content paginates (spec section 16:
 * logo / company name / document number / customer name on every page).
 */
export function buildRepeatingHeaderHtml(
  data: Pick<QuotationPrintData, 'company' | 'customer' | 'docNumber' | 'revisionNo' | 'docTitle'>,
  copyType: CopyType,
): string {
  return buildHeaderHtmlInternal(data, copyType);
}

export function buildInvoiceRepeatingHeaderHtml(data: InvoicePrintData, copyType: CopyType): string {
  return buildHeaderHtmlInternal({ ...data, revisionNo: 0 }, copyType);
}

function buildHeaderHtmlInternal(
  data: Pick<QuotationPrintData, 'company' | 'customer' | 'docNumber' | 'revisionNo' | 'docTitle'>,
  copyType: CopyType,
): string {
  const copyLabel = COPY_LABELS[copyType];
  const logo = data.company.logoDataUri
    ? `<img src="${data.company.logoDataUri}" style="height:22px;object-fit:contain;margin-right:6px;vertical-align:middle;" />`
    : '';

  return `
    <div style="width:100%;font-family:sans-serif;font-size:8px;color:#333;padding:0 12mm;box-sizing:border-box;
                display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;padding-bottom:3px;">
      <div style="display:flex;align-items:center;">
        ${logo}
        <span style="font-weight:bold;">${esc(data.company.nameTh)}</span>
      </div>
      <div style="text-align:right;">
        <span>${esc(data.docTitle)} ${esc(data.docNumber)}${data.revisionNo > 0 ? ' Rev.' + data.revisionNo : ''}</span>
        &nbsp;|&nbsp;
        <span>ลูกค้า: ${esc(data.customer.name)}</span>
        &nbsp;|&nbsp;
        <span style="border:1px solid #999;border-radius:3px;padding:0 4px;">${esc(copyLabel.th)}</span>
      </div>
    </div>
  `;
}
