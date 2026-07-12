// Integration test (spec section 30 / 14): fires many concurrent document
// number requests and asserts every issued number is unique - this is the
// scenario multiple Sales users hitting "Create Quotation" at the same
// moment on the LAN would produce.
import { generateDocNumber } from '../src/lib/docNumber';
import { prisma } from '../src/lib/prisma';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  const CONCURRENCY = 50;
  const promises = Array.from({ length: CONCURRENCY }, () => generateDocNumber('QUOTATION'));
  const results = await Promise.all(promises);

  const unique = new Set(results);
  assert(unique.size === CONCURRENCY, `Expected ${CONCURRENCY} unique doc numbers, got ${unique.size} (duplicates present!)`);

  const sorted = [...results].sort();
  console.log('=== DOC NUMBER UNIQUENESS TEST: PASSED ===');
  console.log(`  - Generated ${CONCURRENCY} concurrent quotation numbers, all unique.`);
  console.log(`  - First: ${sorted[0]}`);
  console.log(`  - Last:  ${sorted[sorted.length - 1]}`);
}

main()
  .catch((err) => {
    console.error('=== DOC NUMBER UNIQUENESS TEST: FAILED ===');
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
