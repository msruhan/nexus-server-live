/**
 * Detect whether Prisma tables exist (avoids scheduler noise during build / empty DB).
 */
const g = globalThis as typeof globalThis & {
  __dbSchemaReady?: boolean;
};

const PROBE_TABLE = 'ImeiOrder';

export async function isDbSchemaReady(): Promise<boolean> {
  if (g.__dbSchemaReady !== undefined) return g.__dbSchemaReady;

  try {
    const { prisma } = await import('@/lib/db');
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = ${PROBE_TABLE}
      LIMIT 1
    `;
    g.__dbSchemaReady = rows.length > 0;
  } catch {
    g.__dbSchemaReady = false;
  }

  return g.__dbSchemaReady;
}

export function isPrismaMissingTableError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === 'P2021'
  );
}
