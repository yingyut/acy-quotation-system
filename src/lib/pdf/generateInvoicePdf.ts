import { PDFDocument } from 'pdf-lib';
import { signPrintToken } from '@/lib/printToken';
import { renderUrlToPdf, buildInternalPrintUrl, PRINT_MARGINS } from '@/lib/pdf/generatePdf';
import { buildInvoicePrintData } from '@/lib/pdf/buildInvoicePrintData';
import { buildInvoiceRepeatingHeaderHtml } from '@/lib/pdf/headerTemplate';
import type { CopyType } from '@/lib/pdf/types';

export async function generateInvoicePdf(invoiceId: string, userId: string, copyTypes: CopyType[]): Promise<Buffer> {
  const marginOptions = {
    marginTopMm: PRINT_MARGINS.topMm,
    marginRightMm: PRINT_MARGINS.sideMm,
    marginBottomMm: PRINT_MARGINS.bottomMm,
    marginLeftMm: PRINT_MARGINS.sideMm,
    showPageNumber: true,
  };

  const token = signPrintToken({ docType: 'invoice', id: invoiceId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildInvoicePrintData(invoiceId, copyType);
    const headerHtml = buildInvoiceRepeatingHeaderHtml(printData);
    const url = buildInternalPrintUrl(`/print/invoice/${invoiceId}?copy=${copyType}&token=${token}`);
    buffers.push(await renderUrlToPdf(url, { ...marginOptions, headerHtml }));
  }

  if (buffers.length === 1) return buffers[0];

  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
}
