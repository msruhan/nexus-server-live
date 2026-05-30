/**
 * One-time migration: rewrite legacy order codes (IMEI-*, SN-*, SRV-*, plain alphanumeric)
 * to the current ID-XXXXXXXXXXXX format.
 *
 * Usage: npx tsx scripts/migrate-order-codes.ts
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX = 'ID-';
const SUFFIX_LENGTH = 12;

function randomSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += CHARSET[bytes[i]! % CHARSET.length];
  }
  return suffix;
}

async function nextUniqueCode(taken: Set<string>): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = `${PREFIX}${randomSuffix()}`;
    if (taken.has(code)) continue;
    const [imei, server] = await Promise.all([
      prisma.imeiOrder.findUnique({ where: { orderCode: code }, select: { id: true } }),
      prisma.serverOrder.findUnique({ where: { orderCode: code }, select: { id: true } }),
    ]);
    if (!imei && !server) {
      taken.add(code);
      return code;
    }
  }
  throw new Error('Could not allocate a unique order code');
}

function isLegacyCode(code: string): boolean {
  return !code.toUpperCase().startsWith(PREFIX);
}

async function main() {
  const taken = new Set<string>();

  const existing = await Promise.all([
    prisma.imeiOrder.findMany({ select: { orderCode: true } }),
    prisma.serverOrder.findMany({ select: { orderCode: true } }),
  ]);
  for (const row of [...existing[0], ...existing[1]]) {
    taken.add(row.orderCode.toUpperCase());
  }

  const imeiRows = await prisma.imeiOrder.findMany({
    where: {},
    select: { id: true, orderCode: true },
    orderBy: { createdAt: 'asc' },
  });

  let imeiMigrated = 0;
  for (const row of imeiRows) {
    if (!isLegacyCode(row.orderCode)) continue;
    const newCode = await nextUniqueCode(taken);
    await prisma.imeiOrder.update({
      where: { id: row.id },
      data: { orderCode: newCode },
    });
    console.log(`  IMEI ${row.orderCode} → ${newCode}`);
    imeiMigrated++;
  }

  const serverRows = await prisma.serverOrder.findMany({
    where: {},
    select: { id: true, orderCode: true },
    orderBy: { createdAt: 'asc' },
  });

  let serverMigrated = 0;
  for (const row of serverRows) {
    if (!isLegacyCode(row.orderCode)) continue;
    const newCode = await nextUniqueCode(taken);
    await prisma.serverOrder.update({
      where: { id: row.id },
      data: { orderCode: newCode },
    });
    console.log(`  Server ${row.orderCode} → ${newCode}`);
    serverMigrated++;
  }

  console.log(`\nDone. Migrated ${imeiMigrated} IMEI order(s), ${serverMigrated} server order(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
