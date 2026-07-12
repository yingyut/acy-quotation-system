import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { signPrintToken } from '@/lib/printToken';
import { renderUrlToPdf, buildInternalPrintUrl, PRINT_MARGINS } from '@/lib/pdf/generatePdf';
import { buildQuotationPrintData } from '@/lib/pdf/buildQuotationPrintData';
import { buildRepeatingHeaderHtml } from '@/lib/pdf/headerTemplate';
import type { CopyType } from '@/lib/pdf/types';

export async function generateQuotationPdf(
  quotationId: string,
  userId: string,
  copyTypes: CopyType[],
): Promise<Buffer> {
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { template: true },
  });

  // marginTopMm must closely match the *actual rendered height* of the
  // repeating header (see PRINT_MARGINS doc-comment in generatePdf.ts) -
  // too large and a dead gap appears above the body content on every
  // page; too small and the header gets clipped/overlapped.
  const marginOptions = {
    marginTopMm: PRINT_MARGINS.topMm,
    marginRightMm: quotation.template?.marginRightMm ?? PRINT_MARGINS.sideMm,
    marginBottomMm: quotation.template?.marginBottomMm ?? PRINT_MARGINS.bottomMm,
    marginLeftMm: quotation.template?.marginLeftMm ?? PRINT_MARGINS.sideMm,
    showPageNumber: quotation.template?.showPageNumber ?? true,
  };

  const token = signPrintToken({ docType: 'quotation', id: quotationId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildQuotationPrintData(quotationId, copyType);
    const headerHtml = buildRepeatingHeaderHtml(printData);
    const url = buildInternalPrintUrl(`/print/quotation/${quotationId}?copy=${copyType}&token=${token}`);
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
