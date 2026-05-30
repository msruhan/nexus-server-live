export type PriceGroupAdjustmentType = 'PERCENT' | 'FIXED';

export function formatPriceGroupRule(args: {
  adjustmentType: string;
  discountPercent: number;
  fixedAdjustment: number;
}): string {
  if (args.adjustmentType === 'FIXED') {
    const n = args.fixedAdjustment;
    if (!Number.isFinite(n) || n === 0) return 'Retail (no adjustment)';
    const sign = n > 0 ? '+' : '';
    return `${sign}$${n.toFixed(2)} per service`;
  }
  const p = args.discountPercent;
  if (!Number.isFinite(p) || p <= 0) return 'Retail (no adjustment)';
  return `${p}% off retail`;
}

export function serializePriceGroup<
  T extends { discountPercent: unknown; fixedAdjustment?: unknown; adjustmentType?: string },
>(row: T): T & { discountPercent: number; fixedAdjustment: number; adjustmentType: string } {
  return {
    ...row,
    adjustmentType: row.adjustmentType === 'FIXED' ? 'FIXED' : 'PERCENT',
    discountPercent: Number(row.discountPercent),
    fixedAdjustment: Number(row.fixedAdjustment ?? 0),
  };
}
