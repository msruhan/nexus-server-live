import { formatPriceGroupDefault } from '@/lib/price-group-rule';

export type PriceGroupAdjustmentType = 'PERCENT' | 'FIXED';

export function formatPriceGroupRule(args: {
  defaultEnabled?: boolean;
  adjustmentType: string;
  discountPercent: number;
  fixedAdjustment: number;
}): string {
  return formatPriceGroupDefault({
    defaultEnabled: args.defaultEnabled ?? true,
    adjustmentType: args.adjustmentType,
    discountPercent: args.discountPercent,
    fixedAdjustment: args.fixedAdjustment,
  });
}

export function serializePriceGroup<
  T extends {
    discountPercent: unknown;
    fixedAdjustment?: unknown;
    adjustmentType?: string;
    defaultEnabled?: boolean;
  },
>(row: T): T & { discountPercent: number; fixedAdjustment: number; adjustmentType: string; defaultEnabled: boolean } {
  return {
    ...row,
    defaultEnabled: row.defaultEnabled ?? true,
    adjustmentType: row.adjustmentType === 'FIXED' ? 'FIXED' : 'PERCENT',
    discountPercent: Number(row.discountPercent),
    fixedAdjustment: Number(row.fixedAdjustment ?? 0),
  };
}
