import { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

export type PriceRuleType = 'PERCENT' | 'FIXED' | 'ABSOLUTE';
export type PriceRuleScope = 'CATALOG_GROUP' | 'SERVICE';
export type PriceRuleKind = 'imei' | 'server';

export type PriceRuleValues = {
  ruleType: PriceRuleType;
  discountPercent?: number | null;
  fixedAdjustment?: number | null;
  absolutePrice?: number | null;
};

export const priceRuleUpsertSchema = z
  .object({
    scope: z.enum(['CATALOG_GROUP', 'SERVICE']),
    kind: z.enum(['imei', 'server']),
    catalogGroupId: z.string().cuid().optional(),
    serviceId: z.string().cuid().optional(),
    ruleType: z.enum(['PERCENT', 'FIXED', 'ABSOLUTE']),
    discountPercent: z.number().min(0).max(50).optional(),
    fixedAdjustment: z.number().min(-100000).max(100000).optional(),
    absolutePrice: z.number().positive().max(1_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'CATALOG_GROUP' && !data.catalogGroupId) {
      ctx.addIssue({ code: 'custom', message: 'catalogGroupId required', path: ['catalogGroupId'] });
    }
    if (data.scope === 'SERVICE' && !data.serviceId) {
      ctx.addIssue({ code: 'custom', message: 'serviceId required', path: ['serviceId'] });
    }
    if (data.ruleType === 'PERCENT' && data.discountPercent === undefined) {
      ctx.addIssue({ code: 'custom', message: 'discountPercent required', path: ['discountPercent'] });
    }
    if (data.ruleType === 'FIXED' && data.fixedAdjustment === undefined) {
      ctx.addIssue({ code: 'custom', message: 'fixedAdjustment required', path: ['fixedAdjustment'] });
    }
    if (data.ruleType === 'ABSOLUTE' && data.absolutePrice === undefined) {
      ctx.addIssue({ code: 'custom', message: 'absolutePrice required', path: ['absolutePrice'] });
    }
  });

export function formatPriceRuleSummary(rule: PriceRuleValues): string {
  if (rule.ruleType === 'ABSOLUTE') {
    const p = rule.absolutePrice ?? 0;
    return `$${Number(p).toFixed(2)} fixed`;
  }
  if (rule.ruleType === 'FIXED') {
    const n = rule.fixedAdjustment ?? 0;
    if (!Number.isFinite(n) || n === 0) return 'Retail (no adjustment)';
    const sign = n > 0 ? '+' : '';
    return `${sign}$${n.toFixed(2)} per service`;
  }
  const p = rule.discountPercent ?? 0;
  if (!Number.isFinite(p) || p <= 0) return 'Retail (no adjustment)';
  return `${p}% off retail`;
}

export function formatPriceGroupDefault(args: {
  defaultEnabled: boolean;
  adjustmentType: string;
  discountPercent: number;
  fixedAdjustment: number;
}): string {
  if (!args.defaultEnabled) return 'No default (retail unless ruled)';
  if (args.adjustmentType === 'FIXED') {
    return formatPriceRuleSummary({ ruleType: 'FIXED', fixedAdjustment: args.fixedAdjustment });
  }
  return formatPriceRuleSummary({ ruleType: 'PERCENT', discountPercent: args.discountPercent });
}

function multiplyByPercentDown(base: Decimal, percent: number): Decimal {
  const factor = new Prisma.Decimal((100 - percent) / 100);
  return base.mul(factor).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
}

/** Apply a rule (% / ± / absolute) to a retail base price. */
export function applyPriceRule(basePrice: Decimal, rule: PriceRuleValues): Decimal {
  if (rule.ruleType === 'ABSOLUTE') {
    const p = new Prisma.Decimal(rule.absolutePrice ?? 0);
    return p.lessThan(0.01) ? new Prisma.Decimal(0.01) : p.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  }
  if (rule.ruleType === 'FIXED') {
    const delta = Number(rule.fixedAdjustment ?? 0);
    if (!Number.isFinite(delta) || delta === 0) return basePrice;
    const summed = basePrice.add(new Prisma.Decimal(delta)).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    return summed.lessThan(0) ? new Prisma.Decimal(0) : summed;
  }
  const percent = Number(rule.discountPercent ?? 0);
  if (!Number.isFinite(percent) || percent <= 0) return basePrice;
  const clamped = Math.max(0, Math.min(50, percent));
  return multiplyByPercentDown(basePrice, clamped);
}

export function ruleValuesFromRow(row: {
  ruleType: string;
  discountPercent: unknown;
  fixedAdjustment: unknown;
  absolutePrice: unknown;
}): PriceRuleValues {
  const ruleType =
    row.ruleType === 'FIXED' ? 'FIXED' : row.ruleType === 'ABSOLUTE' ? 'ABSOLUTE' : 'PERCENT';
  return {
    ruleType,
    discountPercent: row.discountPercent != null ? Number(row.discountPercent) : null,
    fixedAdjustment: row.fixedAdjustment != null ? Number(row.fixedAdjustment) : null,
    absolutePrice: row.absolutePrice != null ? Number(row.absolutePrice) : null,
  };
}

export function ruleDataFromPayload(parsed: z.infer<typeof priceRuleUpsertSchema>) {
  const base = {
    scope: parsed.scope,
    kind: parsed.kind,
    ruleType: parsed.ruleType,
    imeiGroupId: null as string | null,
    serverBoxId: null as string | null,
    imeiServiceId: null as string | null,
    serverServiceId: null as string | null,
    discountPercent: null as Prisma.Decimal | null,
    fixedAdjustment: null as Prisma.Decimal | null,
    absolutePrice: null as Prisma.Decimal | null,
  };

  if (parsed.scope === 'CATALOG_GROUP') {
    if (parsed.kind === 'imei') base.imeiGroupId = parsed.catalogGroupId!;
    else base.serverBoxId = parsed.catalogGroupId!;
  } else {
    if (parsed.kind === 'imei') base.imeiServiceId = parsed.serviceId!;
    else base.serverServiceId = parsed.serviceId!;
  }

  if (parsed.ruleType === 'PERCENT') {
    base.discountPercent = new Prisma.Decimal(parsed.discountPercent ?? 0);
  } else if (parsed.ruleType === 'FIXED') {
    base.fixedAdjustment = new Prisma.Decimal(parsed.fixedAdjustment ?? 0);
  } else {
    base.absolutePrice = new Prisma.Decimal(parsed.absolutePrice ?? 0);
  }

  return base;
}
