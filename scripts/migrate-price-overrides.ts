/**
 * One-time migration: copy legacy ServicePriceOverride rows into PriceGroupRule
 * (scope=SERVICE, ruleType=ABSOLUTE) before dropping the old table.
 *
 * Safe to re-run: skips overrides that already have a matching rule.
 *
 * Usage:
 *   npx tsx scripts/migrate-price-overrides.ts
 *   npm run db:migrate-price-overrides
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type LegacyOverride = {
  id: string;
  priceGroupId: string;
  imeiServiceId: string | null;
  serverServiceId: string | null;
  price: unknown;
};

async function readLegacyOverrides(): Promise<LegacyOverride[]> {
  try {
    return await prisma.$queryRaw<LegacyOverride[]>`
      SELECT id, "priceGroupId", "imeiServiceId", "serverServiceId", price
      FROM "ServicePriceOverride"
      ORDER BY "createdAt" ASC
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ServicePriceOverride') && msg.includes('does not exist')) {
      console.log('ServicePriceOverride table not found — nothing to migrate.');
      return [];
    }
    throw e;
  }
}

async function main() {
  const overrides = await readLegacyOverrides();
  if (overrides.length === 0) {
    console.log('No legacy overrides to migrate.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const row of overrides) {
    const kind = row.imeiServiceId ? 'imei' : 'server';
    const existing = await prisma.priceGroupRule.findFirst({
      where: {
        priceGroupId: row.priceGroupId,
        scope: 'SERVICE',
        ...(row.imeiServiceId
          ? { imeiServiceId: row.imeiServiceId }
          : { serverServiceId: row.serverServiceId! }),
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.priceGroupRule.create({
      data: {
        priceGroupId: row.priceGroupId,
        scope: 'SERVICE',
        kind,
        imeiServiceId: row.imeiServiceId,
        serverServiceId: row.serverServiceId,
        ruleType: 'ABSOLUTE',
        absolutePrice: row.price as never,
      },
    });
    created++;
    console.log(`  migrated override ${row.id} → PriceGroupRule (group ${row.priceGroupId})`);
  }

  console.log(`Done. Created ${created} rule(s), skipped ${skipped} existing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
