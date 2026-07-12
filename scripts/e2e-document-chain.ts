// Integration test (spec section 30: "Integration Test สำหรับการสร้างเอกสาร")
// Drives the real UI end-to-end with a headless browser: login -> create
// quotation -> approve -> convert to Sales Order -> Delivery Note ->
// Invoice -> record payment -> auto-generated Receipt -> export PDFs.
// Run against a live instance: npx tsx scripts/e2e-document-chain.ts
import puppeteer from 'puppeteer';

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const USERNAME = process.env.E2E_USERNAME || 'admin';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin@12345';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const steps: string[] = [];

  try {
    // 1. Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 15000 });
    await page.type('#username', USERNAME);
    await page.type('#password', PASSWORD);
    await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }), page.click('button[type=submit]')]);
    assert(page.url().includes('/dashboard'), 'should land on dashboard after login');
    steps.push('login OK');

    // 2. Find the multi-page PDF test quotation created by prisma/seed.ts
    //    (seedMultiPagePdfTestQuotation) - it is APPROVED but not yet
    //    converted, so every step below has a button to click.
    await page.goto(`${BASE_URL}/quotations?q=ทดสอบ+PDF+หลายหน้า`, { waitUntil: 'load', timeout: 15000 });
    const quotationHref = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find((a) => a.getAttribute('href')?.startsWith('/quotations/'));
      return link?.getAttribute('href') ?? null;
    });
    assert(quotationHref, 'multi-page test quotation not found - run `npx prisma db seed` first');
    await page.goto(`${BASE_URL}${quotationHref}`, { waitUntil: 'load', timeout: 15000 });
    steps.push('opened quotation detail');

    // 3. Convert to Sales Order (button only rendered when status allows it).
    const soButton = await page.$('button::-p-text(แปลงเป็นใบสั่งขาย)');
    let soUrl: string;
    if (soButton) {
      await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }), soButton.click()]);
      assert(page.url().includes('/sales-orders/'), 'should navigate to the new sales order');
      soUrl = page.url();
      steps.push('created sales order: ' + soUrl);
    } else {
      steps.push('sales order already exists, skipping creation');
      await page.goto(`${BASE_URL}${quotationHref}`, { waitUntil: 'load', timeout: 15000 });
      const soLink = await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find((a) => a.getAttribute('href')?.startsWith('/sales-orders/'));
        return link?.getAttribute('href') ?? null;
      });
      assert(soLink, 'expected an existing sales order link');
      soUrl = `${BASE_URL}${soLink}`;
      await page.goto(soUrl, { waitUntil: 'load', timeout: 15000 });
    }

    // 4. Create Delivery Note from the Sales Order.
    const dnButton = await page.$('button::-p-text(สร้างใบส่งสินค้า)');
    if (dnButton) {
      await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }), dnButton.click()]);
      assert(page.url().includes('/delivery-notes/'), 'should navigate to the new delivery note');
      steps.push('created delivery note: ' + page.url());
    } else {
      steps.push('delivery note already exists, skipping creation');
    }

    // 5. Create Invoice from the Sales Order.
    await page.goto(soUrl, { waitUntil: 'load', timeout: 15000 });
    const invButton = await page.$('button::-p-text(สร้างใบแจ้งหนี้)');
    let invoiceUrl: string;
    if (invButton) {
      await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }), invButton.click()]);
      assert(page.url().includes('/invoices/'), 'should navigate to the new invoice');
      invoiceUrl = page.url();
      steps.push('created invoice: ' + invoiceUrl);
    } else {
      const invLink = await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find((a) => a.getAttribute('href')?.startsWith('/invoices/'));
        return link?.getAttribute('href') ?? null;
      });
      assert(invLink, 'expected an existing invoice link');
      invoiceUrl = `${BASE_URL}${invLink}`;
      await page.goto(invoiceUrl, { waitUntil: 'load', timeout: 15000 });
      steps.push('invoice already exists: ' + invoiceUrl);
    }

    // 6. Record a payment (full balance) - this should auto-create a Receipt.
    const balanceText = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input[name=amount]'))[0] as HTMLInputElement | undefined;
      return el?.max ?? null;
    });
    if (balanceText && Number(balanceText) > 0) {
      await page.type('input[name=amount]', balanceText);
      await page.click('button::-p-text(บันทึกการรับชำระ)');
      await new Promise((r) => setTimeout(r, 2000));
      steps.push(`recorded payment of ${balanceText}`);
    } else {
      steps.push('invoice already fully paid, skipping payment');
    }

    // 7. Verify a Receipt link now exists and its PDF downloads successfully.
    await page.reload({ waitUntil: 'load', timeout: 15000 });
    const receiptHref = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find((a) => a.getAttribute('href')?.startsWith('/receipts/'));
      return link?.getAttribute('href') ?? null;
    });
    assert(receiptHref, 'expected a receipt link to appear after payment');
    steps.push('receipt created: ' + receiptHref);

    // 8. Export PDFs (quotation original+copy, invoice, receipt) and check they are valid PDFs.
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    async function checkPdf(url: string, label: string) {
      const res = await fetch(url, { headers: { Cookie: cookieHeader } });
      assert(res.ok, `${label} PDF export failed with status ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      assert(buf.subarray(0, 4).toString() === '%PDF', `${label} response is not a valid PDF`);
      steps.push(`${label} PDF OK (${buf.byteLength} bytes)`);
    }

    await checkPdf(`${BASE_URL}/api/quotations/${quotationHref!.split('/').pop()}/pdf?copies=ORIGINAL,COPY_ACCOUNTING`, 'quotation');
    await checkPdf(`${BASE_URL}${invoiceUrl.replace(BASE_URL, '')}`.replace('/invoices/', '/api/invoices/') + '/pdf?copies=ORIGINAL', 'invoice');
    await checkPdf(`${BASE_URL}${receiptHref}`.replace('/receipts/', '/api/receipts/') + '/pdf?copies=ORIGINAL', 'receipt');

    console.log('\n=== E2E DOCUMENT CHAIN TEST: PASSED ===');
    steps.forEach((s) => console.log('  - ' + s));
  } catch (err) {
    console.error('\n=== E2E DOCUMENT CHAIN TEST: FAILED ===');
    steps.forEach((s) => console.log('  - ' + s));
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
