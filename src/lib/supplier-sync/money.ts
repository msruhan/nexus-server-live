import { Prisma } from '@prisma/client';

export function roundMoney(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}

export function toNum(value: number | Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}
