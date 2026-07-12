/**
 * Manual Page Composition engine. Instead of relying on Chromium's
 * automatic CSS pagination or Puppeteer's isolated headerTemplate
 * reservation, we pre-compute exactly which items land on which page
 * using REAL measured row heights (see measurePages.ts for the
 * Puppeteer-driven measurement pass, and the Admin live preview's
 * client-side DOM measurement - both call this same pure function so
 * preview pagination and PDF pagination are identical).
 */

export interface RowHeights {
  /** Height in px of each item row, in item order. */
  itemHeightsPx: number[];
  /** Height in px of the full (page-1) header block (company + title + meta + validity + customer + project). */
  fullHeaderHeightPx: number;
  /** Height in px of the compact (continuation-page) header block. */
  compactHeaderHeightPx: number;
  /** Height in px of the item-table column header row. */
  tableHeaderHeightPx: number;
  /** Height in px of the combined summary+signature+footer block (last page only). */
  summarySignatureHeightPx: number;
  /** Usable content height in px, for one page. */
  usableHeightPx: number;
}

export interface PageComposeOptions {
  fullHeaderFirstPage: boolean;
  compactHeaderFollowingPages: boolean;
  repeatHeaderEveryPage: boolean;
  repeatTableHeaderEveryPage: boolean;
}

export interface PageSlice {
  pageNumber: number;
  itemStartIndex: number;
  /** Exclusive end index. */
  itemEndIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  showHeader: boolean;
  useFullHeader: boolean;
  showTableHeader: boolean;
}

export interface PageModel {
  pages: PageSlice[];
}

function headerHeightFor(rows: RowHeights, opts: PageComposeOptions, isFirstPage: boolean): { showHeader: boolean; useFullHeader: boolean; heightPx: number } {
  const showHeader = isFirstPage || opts.repeatHeaderEveryPage;
  if (!showHeader) return { showHeader: false, useFullHeader: false, heightPx: 0 };
  const useFullHeader = isFirstPage ? opts.fullHeaderFirstPage : !opts.compactHeaderFollowingPages;
  return { showHeader, useFullHeader, heightPx: useFullHeader ? rows.fullHeaderHeightPx : rows.compactHeaderHeightPx };
}

export function computePageModel(rows: RowHeights, opts: PageComposeOptions): PageModel {
  const n = rows.itemHeightsPx.length;
  const pages: PageSlice[] = [];
  let idx = 0;
  let pageNumber = 1;

  if (n === 0) {
    // No items at all - still need exactly one page for header + empty
    // table + summary/signature, never zero pages.
    const h = headerHeightFor(rows, opts, true);
    pages.push({
      pageNumber: 1,
      itemStartIndex: 0,
      itemEndIndex: 0,
      isFirstPage: true,
      isLastPage: true,
      showHeader: h.showHeader,
      useFullHeader: h.useFullHeader,
      showTableHeader: true,
    });
    return { pages };
  }

  while (idx < n) {
    const isFirstPage = pageNumber === 1;
    const h = headerHeightFor(rows, opts, isFirstPage);
    const showTableHeader = isFirstPage || opts.repeatTableHeaderEveryPage;
    const tableHeaderH = showTableHeader ? rows.tableHeaderHeightPx : 0;
    const budget = Math.max(0, rows.usableHeightPx - h.heightPx - tableHeaderH);

    let consumed = 0;
    let end = idx;
    while (end < n && consumed + rows.itemHeightsPx[end] <= budget) {
      consumed += rows.itemHeightsPx[end];
      end += 1;
    }
    // Never split a row: if even the first row on this page doesn't fit
    // the budget (an oversized row, e.g. a huge spec block), force it onto
    // its own page rather than looping forever.
    if (end === idx) end = idx + 1;

    const isLastContentChunk = end >= n;
    const fitsSummaryHere = isLastContentChunk && consumed + rows.summarySignatureHeightPx <= budget;

    pages.push({
      pageNumber,
      itemStartIndex: idx,
      itemEndIndex: end,
      isFirstPage,
      isLastPage: fitsSummaryHere,
      showHeader: h.showHeader,
      useFullHeader: h.useFullHeader,
      showTableHeader,
    });

    idx = end;
    pageNumber += 1;
  }

  const last = pages[pages.length - 1];
  if (!last.isLastPage) {
    // Summary/signature didn't fit on the final content page - give it its
    // own trailing page (never blank: it always carries real content).
    const h = headerHeightFor(rows, opts, false);
    pages.push({
      pageNumber,
      itemStartIndex: idx,
      itemEndIndex: idx,
      isFirstPage: false,
      isLastPage: true,
      showHeader: h.showHeader,
      useFullHeader: h.useFullHeader,
      showTableHeader: false,
    });
  }

  return { pages };
}
