import { PDFDocument } from 'pdf-lib';
import { signPrintToken } from '@/lib/printToken';
import { renderUrlToPdf, buildInternalPrintUrl } from '@/lib/pdf/generatePdf';
import { buildReceiptPrintData } from '@/lib/pdf/buildReceiptPrintData';
import { buildInvoiceRepeatingHeaderHtml } from '@/lib/pdf/headerTemplate';
import type { CopyType } from '@/lib/pdf/types';

export async function generateReceiptPdf(receiptId: string, userId: string, copyTypes: CopyType[]): Promise<Buffer> {
  const marginOptions = { marginTopMm: 15 + 30, marginRightMm: 12, marginBottomMm: 15, marginLeftMm: 12, showPageNumber: true };
  const token = signPrintToken({ docType: 'receipt', id: receiptId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildReceiptPrintData(receiptId, copyType);
    const headerHtml = buildInvoiceRepeatingHeaderHtml(printData);
    const url = buildInternalPrintUrl(`/print/receipt/${receiptId}?copy=${copyType}&token=${token}`);
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
