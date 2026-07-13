import type { ReactNode } from 'react';
import type { DocumentPrintData, PrintLineItem } from '@/lib/pdf/types';
import { money } from './format';

const IMAGE_SIZE_PX: Record<string, number> = { NONE: 0, SMALL: 36, MEDIUM: 64, FULL: 120 };

function cellValue(item: PrintLineItem, key: string): ReactNode {
  switch (key) {
    case 'no':
      return item.no ?? '';
    case 'code':
      return item.code;
    case 'qty':
      return item.qty;
    case 'unit':
      return item.unit;
    case 'unitPrice':
      return item.hideUnitPrice ? '-' : money(item.unitPrice);
    case 'discount':
      return item.discountLabel ?? '-';
    case 'lineTotal':
      return money(item.lineTotal);
    default:
      return null;
  }
}

export function ItemTable({
  data,
  items,
  startIndex,
  showHeader,
}: {
  data: DocumentPrintData;
  /** The slice of items rendered on this page. */
  items: PrintLineItem[];
  /** This slice's starting index into the full `data.items` array - used to
   *  produce a stable, globally-unique data-row-idx for height measurement
   *  (read via `document.querySelectorAll('[data-row-idx]')` by both the
   *  Puppeteer measure pass and the Admin live preview - no refs, since
   *  this component renders inside Server Components for the real PDF
   *  print pages and React forbids refs there). */
  startIndex: number;
  showHeader: boolean;
}) {
  const cfg = data.config.itemTable;
  const visibleCols = cfg.columns.filter((c) => c.visible);
  const imgSize = IMAGE_SIZE_PX[cfg.productImageMode] ?? 0;

  return (
    <table className="doc" data-role="item-table">
      {/* table-layout: fixed (see printStyles.ts) sizes columns strictly
          from this colgroup, not from row content - without it, the
          browser's automatic table layout sizes columns per-table-instance
          based on whichever rows are actually present, so the same column
          could render at a different width in the off-screen measure pass
          (which lays out ALL items in one table) versus a single page's
          table (a slice of items), silently invalidating the measured row
          heights used for pagination. */}
      <colgroup>
        {visibleCols.map((col) => (
          <col key={col.key} style={{ width: `${col.widthMm}mm` }} />
        ))}
      </colgroup>
      {showHeader && (
        <thead data-role="table-header">
          <tr>
            {visibleCols.map((col) => (
              <th key={col.key} className={`col-head align-${col.align}`} style={{ width: `${col.widthMm}mm` }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {items.map((item, i) => {
          const globalIdx = startIndex + i;
          if (item.itemType === 'HEADING') {
            return (
              <tr key={globalIdx} className="heading-row" data-row-idx={globalIdx}>
                <td className="item-cell" colSpan={visibleCols.length}>
                  {item.name}
                </td>
              </tr>
            );
          }
          if (item.itemType === 'TEXT') {
            return (
              <tr key={globalIdx} className="text-row" data-row-idx={globalIdx}>
                <td className="item-cell"></td>
                <td className="item-cell" colSpan={visibleCols.length - 1}>
                  {item.name}
                </td>
              </tr>
            );
          }
          return (
            <tr key={globalIdx} data-row-idx={globalIdx}>
              {visibleCols.map((col) => {
                if (col.key === 'name') {
                  return (
                    <td key={col.key} className={`item-cell align-${col.align}`}>
                      <div className="item-name">{item.name}</div>
                      {cfg.showSpec && item.description && <div className="item-desc">{item.description}</div>}
                      {cfg.showProductImage && item.imageDataUri && imgSize > 0 && (
                        <img
                          className="item-img"
                          src={item.imageDataUri}
                          alt=""
                          style={{ width: imgSize, height: imgSize }}
                        />
                      )}
                    </td>
                  );
                }
                return (
                  <td key={col.key} className={`item-cell align-${col.align}`}>
                    {cellValue(item, col.key)}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
