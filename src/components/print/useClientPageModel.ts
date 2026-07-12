'use client';

import { useEffect, useState, type RefObject } from 'react';
import { computePageModel, type PageModel } from '@/lib/pdf/pageComposer';
import type { DocumentPrintData } from '@/lib/pdf/types';

const pad = (n: number) => Math.ceil(n) + 2;

/**
 * Measures the hidden `mode="measure"` DocumentRenderer tree (rendered by
 * the caller into `measureContainerRef`) using real DOM heights, then runs
 * it through the exact same `computePageModel` function the server-side
 * Puppeteer measurement pass uses (see measurePages.ts). This is what
 * makes the Admin live preview's pagination genuinely identical to the
 * final PDF's pagination, not a separate estimate.
 */
export function useClientPageModel(data: DocumentPrintData, measureContainerRef: RefObject<HTMLDivElement>): PageModel | null {
  const [model, setModel] = useState<PageModel | null>(null);

  useEffect(() => {
    const container = measureContainerRef.current;
    if (!container) return undefined;

    let cancelled = false;

    // Wait for the web font to finish loading before measuring - otherwise
    // text can be measured against fallback-font metrics that wrap
    // differently than the real render (see measurePages.ts for the same
    // fix on the server-side Puppeteer measurement pass).
    document.fonts.ready.then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const heightOf = (sel: string) => {
          const el = container.querySelector(sel) as HTMLElement | null;
          return el ? el.getBoundingClientRect().height : 0;
        };

        const usableHeightPx = Math.floor(heightOf('[data-role="page-ruler"]'));
        const fullHeaderHeightPx = pad(heightOf('[data-role="header-page1"]'));
        const compactHeaderHeightPx = pad(heightOf('[data-role="header-compact"]'));
        const tableHeaderHeightPx = pad(heightOf('[data-role="table-header"]'));
        const summarySignatureHeightPx = pad(heightOf('[data-role="summary-signature"]'));

        const rowEls = Array.from(container.querySelectorAll('[data-row-idx]')) as HTMLElement[];
        const map = new Map<number, number>();
        for (const r of rowEls) {
          const idx = Number(r.getAttribute('data-row-idx'));
          map.set(idx, Math.max(map.get(idx) ?? 0, r.getBoundingClientRect().height));
        }
        const maxIdx = Math.max(-1, ...Array.from(map.keys()));
        const itemHeightsPx: number[] = [];
        for (let i = 0; i <= maxIdx; i++) itemHeightsPx.push(pad(map.get(i) ?? 0));

        setModel(
          computePageModel(
            { itemHeightsPx, fullHeaderHeightPx, compactHeaderHeightPx, tableHeaderHeightPx, summarySignatureHeightPx, usableHeightPx },
            {
              fullHeaderFirstPage: data.config.header.fullHeaderFirstPage,
              compactHeaderFollowingPages: data.config.header.compactHeaderFollowingPages,
              repeatHeaderEveryPage: data.config.header.repeatEveryPage,
              repeatTableHeaderEveryPage: data.config.itemTable.repeatHeaderEveryPage,
            },
          ),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  });

  return model;
}
