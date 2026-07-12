import type { DocumentPrintData } from '@/lib/pdf/types';
import type { PageModel } from '@/lib/pdf/pageComposer';
import { buildPrintCss } from './printStyles';
import {
  CompanyHeader,
  DocumentTitle,
  DocumentMeta,
  ValiditySection,
  CustomerSection,
  ProjectSection,
  ItemTable,
  AmountInWords,
  SummarySection,
  NotesSection,
  BankSection,
  SignatureSection,
  PageFooter,
} from './blocks';

/**
 * The single component tree that renders every document type
 * (Quotation/Invoice/TaxInvoice/Receipt/DeliveryNote) and every rendering
 * context (Admin live preview, Puppeteer measurement pass, final PDF) -
 * composed entirely from `data.config` (see src/lib/pdf/templateConfig.ts)
 * and the 13 shared block components. Nothing here is hard-coded per
 * document type.
 */
export type RenderMode = 'continuous' | 'measure' | 'paged';

export function usableHeightMm(data: DocumentPrintData): number {
  const { general } = data.config;
  const pageHeightMm = general.orientation === 'landscape' ? 210 : 297;
  return pageHeightMm - general.marginTopMm - general.marginBottomMm;
}

export function contentWidthMm(data: DocumentPrintData): number {
  const { general } = data.config;
  const pageWidthMm = general.orientation === 'landscape' ? 297 : 210;
  return pageWidthMm - general.marginLeftMm - general.marginRightMm;
}

function FullHeaderBlock({ data }: { data: DocumentPrintData }) {
  return (
    <>
      <div className="header-full-row">
        <CompanyHeader data={data} variant="full" />
        <div>
          <DocumentTitle data={data} />
          <DocumentMeta data={data} />
        </div>
      </div>
    </>
  );
}

function Page1ExtrasBlock({ data }: { data: DocumentPrintData }) {
  return (
    <div className="header-block">
      <ValiditySection data={data} />
      <div className={`info-row ${data.config.customer.layout === '1col' ? 'col1' : ''}`}>
        <CustomerSection data={data} />
        <ProjectSection data={data} />
      </div>
    </div>
  );
}

function SummarySignatureBlock({ data }: { data: DocumentPrintData }) {
  return (
    <div className="totals-block">
      <div className={`totals-wrap ${data.config.summary.position === 'left' ? 'pos-left' : ''}`}>
        <div className="left-col">
          <AmountInWords data={data} />
          <NotesSection data={data} />
          <BankSection data={data} />
        </div>
        <SummarySection data={data} />
      </div>
      <SignatureSection data={data} />
      <PageFooter data={data} />
    </div>
  );
}

export function DocumentRenderer({
  data,
  mode,
  pageModel,
}: {
  data: DocumentPrintData;
  mode: RenderMode;
  pageModel?: PageModel;
}) {
  const css = buildPrintCss(data.config);
  const landscapeClass = data.config.general.orientation === 'landscape' ? 'landscape' : '';

  if (mode === 'measure') {
    return (
      <div className="print-root">
        <style>{css}</style>
        <div className="measure-scratch" style={{ width: `${contentWidthMm(data)}mm` }}>
          <div data-role="page-ruler" style={{ height: `${usableHeightMm(data)}mm` }} />
          <div data-role="header-page1">
            <FullHeaderBlock data={data} />
            <Page1ExtrasBlock data={data} />
          </div>
          <div data-role="header-compact">
            <CompanyHeader data={data} variant="compact" />
          </div>
          <ItemTable data={data} items={[]} startIndex={0} showHeader />
          <div data-role="summary-signature">
            <SummarySignatureBlock data={data} />
          </div>
          <ItemTable data={data} items={data.items} startIndex={0} showHeader={false} />
        </div>
      </div>
    );
  }

  if (mode === 'paged' && pageModel) {
    return (
      <div className="print-root">
        <style>{css}</style>
        {pageModel.pages.map((slice) => (
          <div className={`a4-page ${landscapeClass}`} key={slice.pageNumber}>
            {slice.showHeader &&
              (slice.useFullHeader ? <FullHeaderBlock data={data} /> : <CompanyHeader data={data} variant="compact" />)}
            {slice.isFirstPage && <Page1ExtrasBlock data={data} />}
            <ItemTable
              data={data}
              items={data.items.slice(slice.itemStartIndex, slice.itemEndIndex)}
              startIndex={slice.itemStartIndex}
              showHeader={slice.showTableHeader}
            />
            {slice.isLastPage && <SummarySignatureBlock data={data} />}
            {data.config.sections.showPageNumber && (
              <div className="page-footer-num">
                หน้า {slice.pageNumber} / {pageModel.pages.length}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 'continuous' - simple unpaginated flow, used as an immediate preview
  // fallback before the first page-model measurement pass completes.
  return (
    <div className="print-root">
      <style>{css}</style>
      <div className={`a4-page ${landscapeClass}`}>
        <FullHeaderBlock data={data} />
        <Page1ExtrasBlock data={data} />
        <ItemTable data={data} items={data.items} startIndex={0} showHeader />
        <SummarySignatureBlock data={data} />
      </div>
    </div>
  );
}
