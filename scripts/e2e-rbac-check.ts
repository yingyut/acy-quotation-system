// Integration test: verifies role-based access control per spec section 7 -
// Sales must never see cost/profit figures; Accounting must be able to use
// accounting documents (invoices) but not see quotation cost figures either.
import puppeteer from 'puppeteer';

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function loginAs(browser: import('puppeteer').Browser, username: string, password: string) {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 15000 });
  await page.type('#username', username);
  await page.type('#password', password);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }), page.click('button[type=submit]')]);
  assert(page.url().includes('/dashboard'), `${username} should reach dashboard after login`);
  return page;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const steps: string[] = [];

  try {
    // --- Sales must not see cost figures anywhere ---
    const salesPage = await loginAs(browser, 'sales1', 'Sales@12345');
    steps.push('sales1 logged in');

    await salesPage.goto(`${BASE_URL}/products`, { waitUntil: 'load', timeout: 15000 });
    const salesSeesCostColumn = await salesPage.evaluate(() =>
      Array.from(document.querySelectorAll('th')).some((th) => th.textContent?.includes('ราคาทุน')),
    );
    assert(!salesSeesCostColumn, 'Sales role must NOT see the cost ("ราคาทุน") column on the product list');
    steps.push('confirmed: Sales cannot see product cost column');

    const quotationHref = await salesPage.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find((a) => a.getAttribute('href')?.startsWith('/quotations/'));
      return link?.getAttribute('href') ?? null;
    });
    if (quotationHref) {
      await salesPage.goto(`${BASE_URL}${quotationHref}`, { waitUntil: 'load', timeout: 15000 });
      const bodyText = await salesPage.evaluate(() => document.body.innerText);
      assert(!bodyText.includes('ต้นทุนรวม'), 'Sales role must NOT see "ต้นทุนรวม" (total cost) on a quotation detail page');
      assert(!bodyText.includes('GP%'), 'Sales role must NOT see GP% on a quotation detail page');
      steps.push('confirmed: Sales cannot see cost/GP on quotation detail');
    } else {
      steps.push('WARNING: no quotation visible to sales1 to verify cost-hiding on detail page (skipped)');
    }

    await salesPage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'load', timeout: 15000 });
    assert(
      (await salesPage.evaluate(() => document.body.innerText)).includes('403') ||
        salesPage.url().includes('/403'),
      'Sales role must be forbidden from /admin/users',
    );
    steps.push('confirmed: Sales is forbidden from user administration');

    // --- Accounting must be able to view/use invoices ---
    const accPage = await loginAs(browser, 'account1', 'Account@12345');
    steps.push('account1 logged in');

    const invoicesRes = await accPage.goto(`${BASE_URL}/invoices`, { waitUntil: 'load', timeout: 15000 });
    assert(invoicesRes && invoicesRes.ok(), 'Accounting role must be able to open /invoices');
    steps.push('confirmed: Accounting can open the invoices list');

    const accSeesCost = await accPage.evaluate(() => document.body.innerText.includes('ต้นทุนรวม'));
    assert(!accSeesCost, 'Accounting role must NOT see quotation cost figures either (view_cost not granted by default)');
    steps.push('confirmed: Accounting does not see quotation cost (not granted by default role)');

    console.log('\n=== RBAC INTEGRATION TEST: PASSED ===');
    steps.forEach((s) => console.log('  - ' + s));
  } catch (err) {
    console.error('\n=== RBAC INTEGRATION TEST: FAILED ===');
    steps.forEach((s) => console.log('  - ' + s));
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
