import puppeteer, { type Browser } from 'puppeteer';
import type { DocumentTemplateConfig } from '@/lib/pdf/templateConfig';

let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
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

/**
 * Renders a URL that already carries a fully computed PageModel (see
 * pageComposer.ts / measurePages.ts) - i.e. the page has manually composed
 * `.a4-page` divs, each with its own baked-in header/margins/footer. No
 * Chromium margin or headerTemplate reservation is used here (that
 * mechanism is what the old fixed-template pipeline relied on); each
 * `.a4-page` div supplies its own padding, so this simply prints the
 * already-paginated document as-is.
 */
export async function renderPagedPdf(url: string, config: DocumentTemplateConfig): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: config.general.orientation === 'landscape',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
