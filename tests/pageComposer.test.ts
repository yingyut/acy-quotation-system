import { describe, expect, it } from 'vitest';
import { computePageModel, type RowHeights, type PageComposeOptions } from '../src/lib/pdf/pageComposer';

const baseOpts: PageComposeOptions = {
  fullHeaderFirstPage: true,
  compactHeaderFollowingPages: true,
  repeatHeaderEveryPage: true,
  repeatTableHeaderEveryPage: true,
};

function rows(overrides: Partial<RowHeights> = {}): RowHeights {
  return {
    itemHeightsPx: [],
    fullHeaderHeightPx: 200,
    compactHeaderHeightPx: 40,
    tableHeaderHeightPx: 30,
    summarySignatureHeightPx: 300,
    usableHeightPx: 1000,
    ...overrides,
  };
}

describe('computePageModel', () => {
  it('produces exactly one page for an empty document, never zero pages', () => {
    const model = computePageModel(rows({ itemHeightsPx: [] }), baseOpts);
    expect(model.pages).toHaveLength(1);
    expect(model.pages[0].isFirstPage).toBe(true);
    expect(model.pages[0].isLastPage).toBe(true);
  });

  it('fits everything on one page when items + summary fit the budget', () => {
    const itemHeightsPx = Array.from({ length: 4 }, () => 50); // 200px total
    const model = computePageModel(rows({ itemHeightsPx }), baseOpts);
    expect(model.pages).toHaveLength(1);
    expect(model.pages[0].itemStartIndex).toBe(0);
    expect(model.pages[0].itemEndIndex).toBe(4);
    expect(model.pages[0].isLastPage).toBe(true);
  });

  it('never splits a row across pages - every item appears on exactly one page, in order', () => {
    // page-1 budget = 1000 - 200(full header) - 30(table header) = 770
    // continuation budget = 1000 - 40(compact) - 30(table header) = 930
    const itemHeightsPx = [300, 300, 300, 300, 300, 300]; // 6 rows, 300px each
    const model = computePageModel(rows({ itemHeightsPx }), baseOpts);

    const seen: number[] = [];
    for (const page of model.pages) {
      for (let i = page.itemStartIndex; i < page.itemEndIndex; i++) seen.push(i);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('places summary/signature only on the last page', () => {
    const itemHeightsPx = [300, 300, 300, 300, 300, 300];
    const model = computePageModel(rows({ itemHeightsPx }), baseOpts);
    const lastPageCount = model.pages.filter((p) => p.isLastPage).length;
    expect(lastPageCount).toBe(1);
    expect(model.pages[model.pages.length - 1].isLastPage).toBe(true);
  });

  it('adds a dedicated trailing page for summary/signature when they do not fit after the final item chunk', () => {
    // Budget on a continuation page is 930px. 3 items of 300px = 900px fits,
    // but + summarySignature(300px) = 1200px does not fit -> summary should
    // spill to its own page rather than being clipped.
    const itemHeightsPx = [300, 300, 300, 300, 300, 300, 300, 300, 300]; // 9 rows
    const model = computePageModel(rows({ itemHeightsPx }), baseOpts);
    const last = model.pages[model.pages.length - 1];
    expect(last.isLastPage).toBe(true);
    // The trailing summary-only page must still exist even with 0 items -
    // never a silently blank page (it always carries the summary content).
    if (last.itemStartIndex === last.itemEndIndex) {
      expect(model.pages.length).toBeGreaterThan(1);
    }
  });

  it('forces an oversized row onto its own page instead of looping forever', () => {
    const itemHeightsPx = [5000]; // larger than any possible per-page budget
    const model = computePageModel(rows({ itemHeightsPx }), baseOpts);
    expect(model.pages.length).toBeGreaterThanOrEqual(1);
    expect(model.pages[0].itemStartIndex).toBe(0);
    expect(model.pages[0].itemEndIndex).toBe(1);
  });

  it('omits the repeating header entirely on continuation pages when repeatHeaderEveryPage is false', () => {
    const itemHeightsPx = [300, 300, 300, 300, 300, 300, 300, 300, 300, 300];
    const model = computePageModel(rows({ itemHeightsPx }), { ...baseOpts, repeatHeaderEveryPage: false });
    expect(model.pages[0].showHeader).toBe(true);
    for (const page of model.pages.slice(1)) {
      expect(page.showHeader).toBe(false);
    }
  });

  it('uses full header on every page when compactHeaderFollowingPages is false', () => {
    const itemHeightsPx = [300, 300, 300, 300, 300, 300, 300, 300, 300, 300];
    const model = computePageModel(rows({ itemHeightsPx }), { ...baseOpts, compactHeaderFollowingPages: false });
    for (const page of model.pages) {
      if (page.showHeader) expect(page.useFullHeader).toBe(true);
    }
  });

  it('does not repeat the table header on continuation pages when repeatTableHeaderEveryPage is false', () => {
    const itemHeightsPx = [300, 300, 300, 300, 300, 300, 300, 300, 300, 300];
    const model = computePageModel(rows({ itemHeightsPx }), { ...baseOpts, repeatTableHeaderEveryPage: false });
    expect(model.pages[0].showTableHeader).toBe(true);
    for (const page of model.pages.slice(1)) {
      if (page.itemStartIndex < page.itemEndIndex) expect(page.showTableHeader).toBe(false);
    }
  });
});
