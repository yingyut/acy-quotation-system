import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { signPrintToken } from '@/lib/printToken';
import { renderUrlToPdf, buildInternalPrintUrl } from '@/lib/pdf/generatePdf';
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

  const marginOptions = {
    marginTopMm: quotation.template?.marginTopMm ?? 15,
    marginRightMm: quotation.template?.marginRightMm ?? 12,
    marginBottomMm: quotation.template?.marginBottomMm ?? 15,
    marginLeftMm: quotation.template?.marginLeftMm ?? 15,
    showPageNumber: quotation.template?.showPageNumber ?? true,
  };

  const token = signPrintToken({ docType: 'quotation', id: quotationId, userId });

  const buffers: Buffer[] = [];
  for (const copyType of copyTypes) {
    const printData = await buildQuotationPrintData(quotationId, copyType);
    const headerHtml = buildRepeatingHeaderHtml(printData, copyType);
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
