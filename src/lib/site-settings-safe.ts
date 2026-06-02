import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export function isPrismaSchemaMissing(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P1001' || error.code === 'P1003')
  );
}

/** Site settings row; null if DB unreachable or schema not migrated yet. */
export async function getSiteSettingsSafe() {
  try {
    return await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  } catch (error) {
    if (isPrismaSchemaMissing(error)) return null;
    throw error;
  }
}
