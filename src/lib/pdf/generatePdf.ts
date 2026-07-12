import puppeteer, { type Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}

export interface RenderPdfOptions {
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  showPageNumber: boolean;
  landscape?: boolean;
  /** Raw HTML repeated at the top of every printed page (logo, company
   *  name, doc number, customer name) - see src/lib/pdf/headerTemplate.ts. */
  headerHtml?: string;
}

/** Base URL the PDF worker uses to reach this same Next.js server. In
 *  Docker this is the container's own loopback (the app listens on
 *  0.0.0.0:3000); the browser-visible NEXTAUTH_URL is not reachable from
 *  inside the container when running behind the nginx reverse proxy. */
function internalBaseUrl(): string {
  return process.env.INTERNAL_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
}

export function buildInternalPrintUrl(path: string): string {
  return `${internalBaseUrl()}${path}`;
}

export async function renderUrlToPdf(url: string, options: RenderPdfOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: options.landscape ?? false,
      printBackground: true,
      margin: {
        top: `${options.marginTopMm + 6}mm`,
        right: `${options.marginRightMm}mm`,
        bottom: `${options.marginBottomMm + (options.showPageNumber ? 8 : 0)}mm`,
        left: `${options.marginLeftMm}mm`,
      },
      displayHeaderFooter: true,
      headerTemplate: options.headerHtml ?? '<div></div>',
      footerTemplate: options.showPageNumber
        ? `<div style="width:100%;font-size:8px;text-align:center;color:#888;font-family:sans-serif;">
             หน้า <span class="pageNumber"></span> / <span class="totalPages"></span>
           </div>`
        : '<div></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
