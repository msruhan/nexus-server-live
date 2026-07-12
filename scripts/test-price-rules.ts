/**
 * Smoke tests for price rule math (no test runner in repo).
 *
 * Usage: npx tsx scripts/test-price-rules.ts
 */
import { Prisma } from '@prisma/client';
import { applyPriceRule } from '../src/lib/price-group-rule';

function assertClose(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const base = new Prisma.Decimal('100.00');

assertClose(
  applyPriceRule(base, { ruleType: 'PERCENT', discountPercent: 10 }).toString(),
  '90',
  '10% off',
);
assertClose(
  applyPriceRule(base, { ruleType: 'FIXED', fixedAdjustment: -5 }).toString(),
  '95',
  '-$5',
);
assertClose(
  applyPriceRule(base, { ruleType: 'ABSOLUTE', absolutePrice: 42.5 }).toString(),
  '42.5',
  'absolute',
);
assertClose(
  applyPriceRule(base, { ruleType: 'PERCENT', discountPercent: 0 }).toString(),
  '100',
  '0% unchanged',
);

console.log('price-rule smoke tests passed');
