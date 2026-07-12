import { PDFDocument } from 'pdf-lib';
import { signPrintToken } from '@/lib/printToken';
import { renderUrlToPdf, buildInternalPrintUrl, PRINT_MARGINS } from '@/lib/pdf/generatePdf';
import { buildDeliveryNotePrintData } from '@/lib/pdf/buildDeliveryNotePrintData';
import { buildDeliveryNoteRepeatingHeaderHtml } from '@/lib/pdf/headerTemplate';
import type { CopyType } from '@/lib/pdf/types';

export async function generateDeliveryNotePdf(
  deliveryNoteId: string,
  userId: string,
  copyTypes: CopyType[],
): Promise<Buffer> {
  const marginOptions = {
    marginTopMm: PRINT_MARGINS.topMm,
    marginRightMm: PRINT_MARGINS.sideMm,
    marginBottomMm: PRINT_MARGINS.bottomMm,
    marginLeftMm: PRINT_MARGINS.sideMm,
    showPageNumber: true,
  };

  const token = signPrintToken({ docType: 'delivery-note', id: deliveryNoteId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildDeliveryNotePrintData(deliveryNoteId, copyType);
    const headerHtml = buildDeliveryNoteRepeatingHeaderHtml(printData);
    const url = buildInternalPrintUrl(`/print/delivery-note/${deliveryNoteId}?copy=${copyType}&token=${token}`);
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
