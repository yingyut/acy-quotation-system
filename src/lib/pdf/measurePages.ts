import { getBrowser } from '@/lib/pdf/generatePdf';
import { computePageModel, type PageModel, type RowHeights } from '@/lib/pdf/pageComposer';
import type { DocumentTemplateConfig } from '@/lib/pdf/templateConfig';

async function heightOf(page: import('puppeteer').Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    return el ? el.getBoundingClientRect().height : 0;
  }, selector);
}

/**
 * Phase 1 of Manual Page Composition: navigate Puppeteer to the print
 * page's `?mode=measure` render (see DocumentRenderer.tsx), which lays out
 * every item row plus a full header, a compact header, one table-header
 * row, and the combined summary+signature block off-screen at real
 * content width - then reads their REAL rendered pixel heights straight
 * from the DOM. Those measured heights feed computePageModel (Phase 2,
 * pure/deterministic) to produce the PageModel used by the final `?mode=
 * paged` render (Phase 3). This is what makes pagination exact instead of
 * estimated: a long product spec or a wrapped multi-line name is measured
 * as it will actually render, not guessed at a fixed row height.
 */
export async function measureAndComposePageModel(
  measureUrl: string,
  config: DocumentTemplateConfig,
): Promise<PageModel> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(measureUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    // Wait for the Sarabun web font to finish loading before measuring.
    // Without this, rows can be measured against fallback-font metrics
    // (different character widths -> different text wrapping -> shorter
    // measured height than the real render), which silently under-counts
    // how much content fits per page and causes Chromium to auto-split a
    // `.a4-page` div's overflow into an extra physical page mid-content
    // (with no repeated header, since that overflow isn't a real page
    // boundary as far as the page model is concerned).
    await page.evaluate(() => (document as unknown as { fonts: FontFaceSet }).fonts.ready);

    const [usableHeightPx, fullHeaderHeightPx, compactHeaderHeightPx, tableHeaderHeightPx, summarySignatureHeightPx] =
      await Promise.all([
        heightOf(page, '[data-role="page-ruler"]'),
        heightOf(page, '[data-role="header-page1"]'),
        heightOf(page, '[data-role="header-compact"]'),
        heightOf(page, '[data-role="table-header"]'),
        heightOf(page, '[data-role="summary-signature"]'),
      ]);

    const itemHeightsPx: number[] = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-row-idx]')) as HTMLElement[];
      const map = new Map<number, number>();
      for (const r of rows) {
        const idx = Number(r.getAttribute('data-row-idx'));
        map.set(idx, Math.max(map.get(idx) ?? 0, r.getBoundingClientRect().height));
      }
      const maxIdx = Math.max(-1, ...Array.from(map.keys()));
      const arr: number[] = [];
      for (let i = 0; i <= maxIdx; i++) arr.push(map.get(i) ?? 0);
      return arr;
    });

    // Small safety margin: round every measured height up and pad it by a
    // couple of px. Protects against sub-pixel/rounding differences between
    // the off-screen measure pass and the final in-flow render, at the
    // (harmless) cost of very occasionally starting a new page slightly
    // earlier than strictly necessary - never the reverse.
    const pad = (n: number) => Math.ceil(n) + 2;

    const rows: RowHeights = {
      itemHeightsPx: itemHeightsPx.map(pad),
      fullHeaderHeightPx: pad(fullHeaderHeightPx),
      compactHeaderHeightPx: pad(compactHeaderHeightPx),
      tableHeaderHeightPx: pad(tableHeaderHeightPx),
      summarySignatureHeightPx: pad(summarySignatureHeightPx),
      usableHeightPx: Math.floor(usableHeightPx),
    };

    return computePageModel(rows, {
      fullHeaderFirstPage: config.header.fullHeaderFirstPage,
      compactHeaderFollowingPages: config.header.compactHeaderFollowingPages,
      repeatHeaderEveryPage: config.header.repeatEveryPage,
      repeatTableHeaderEveryPage: config.itemTable.repeatHeaderEveryPage,
    });
  } finally {
    await page.close();
  }
}

export function encodePageModel(model: PageModel): string {
  return Buffer.from(JSON.stringify(model)).toString('base64url');
}

export function decodePageModel(encoded: string): PageModel {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}
