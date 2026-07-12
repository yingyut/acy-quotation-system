import { PDFDocument } from 'pdf-lib';
import { signPrintToken } from '@/lib/printToken';
import { buildInternalPrintUrl, renderPagedPdf } from '@/lib/pdf/generatePdf';
import { measureAndComposePageModel, encodePageModel } from '@/lib/pdf/measurePages';
import { buildDeliveryNotePrintData } from '@/lib/pdf/buildDeliveryNotePrintData';
import type { CopyType } from '@/lib/pdf/types';

export async function generateDeliveryNotePdf(
  deliveryNoteId: string,
  userId: string,
  copyTypes: CopyType[],
): Promise<Buffer> {
  const token = signPrintToken({ docType: 'delivery-note', id: deliveryNoteId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildDeliveryNotePrintData(deliveryNoteId, copyType);
    const base = `/print/delivery-note/${deliveryNoteId}?copy=${copyType}&token=${token}`;
    const pageModel = await measureAndComposePageModel(buildInternalPrintUrl(`${base}&mode=measure`), printData.config);
    const finalUrl = buildInternalPrintUrl(`${base}&mode=paged&pageModel=${encodePageModel(pageModel)}`);
    buffers.push(await renderPagedPdf(finalUrl, printData.config));
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
