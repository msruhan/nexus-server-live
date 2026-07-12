/**
 * Tiered pricing resolution.
 *
 * Single source of truth for "what does THIS user pay for THIS service?".
 *
 * Precedence:
 *   1. PriceGroupRule scope=SERVICE (per-service)
 *   2. PriceGroupRule scope=CATALOG_GROUP (IMEI group / server box)
 *   3. PriceGroup global default (when defaultEnabled)
 *   4. Retail service.price
 */
import { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/db';
import { applyPriceRule, ruleValuesFromRow, type PriceRuleValues } from '@/lib/price-group-rule';

export type ServiceKind = 'imei' | 'server';

export type ResolvedPrice = {
  price: Decimal;
  base: Decimal;
  discountPercent: number;
  source:
    | 'retail'
    | 'group_percent'
    | 'group_fixed'
    | 'group_override'
    | 'group_rule_service'
    | 'group_rule_catalog';
  groupName: string | null;
};

function globalRuleFromGroup(group: {
  adjustmentType: string;
  discountPercent: unknown;
  fixedAdjustment: unknown;
}): PriceRuleValues {
  const adjustmentType = group.adjustmentType === 'FIXED' ? 'FIXED' : 'PERCENT';
  if (adjustmentType === 'FIXED') {
    return { ruleType: 'FIXED', fixedAdjustment: Number(group.fixedAdjustment ?? 0) };
  }
  return { ruleType: 'PERCENT', discountPercent: Number(group.discountPercent ?? 0) };
}

export async function resolveServicePriceForUser(args: {
  userId: string;
  serviceId: string;
  kind: ServiceKind;
  basePrice: Decimal;
  catalogGroupId?: string | null;
}): Promise<ResolvedPrice> {
  const { userId, serviceId, kind, basePrice } = args;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        priceGroupId: true,
        priceGroup: {
          select: {
            id: true,
            name: true,
            isActive: true,
            defaultEnabled: true,
            adjustmentType: true,
            discountPercent: true,
            fixedAdjustment: true,
          },
        },
      },
    });

    if (!user?.priceGroup || !user.priceGroup.isActive) {
      return {
        price: basePrice,
        base: basePrice,
        discountPercent: 0,
        source: 'retail',
        groupName: null,
      };
    }

    const group = user.priceGroup;
    let catalogGroupId = args.catalogGroupId ?? null;

    if (!catalogGroupId) {
      if (kind === 'imei') {
        const svc = await prisma.imeiService.findUnique({
          where: { id: serviceId },
          select: { groupId: true },
        });
        catalogGroupId = svc?.groupId ?? null;
      } else {
        const svc = await prisma.serverService.findUnique({
          where: { id: serviceId },
          select: { boxId: true },
        });
        catalogGroupId = svc?.boxId ?? null;
      }
    }

    const serviceRule = await prisma.priceGroupRule.findFirst({
      where: {
        priceGroupId: group.id,
        scope: 'SERVICE',
        ...(kind === 'imei' ? { imeiServiceId: serviceId } : { serverServiceId: serviceId }),
      },
    });

    if (serviceRule) {
      const values = ruleValuesFromRow(serviceRule);
      return {
        price: applyPriceRule(basePrice, values),
        base: basePrice,
        discountPercent: values.ruleType === 'PERCENT' ? Number(values.discountPercent ?? 0) : 0,
        source: 'group_rule_service',
        groupName: group.name,
      };
    }

    if (catalogGroupId) {
      const catalogRule = await prisma.priceGroupRule.findFirst({
        where: {
          priceGroupId: group.id,
          scope: 'CATALOG_GROUP',
          ...(kind === 'imei'
            ? { imeiGroupId: catalogGroupId }
            : { serverBoxId: catalogGroupId }),
        },
      });
      if (catalogRule) {
        const values = ruleValuesFromRow(catalogRule);
        return {
          price: applyPriceRule(basePrice, values),
          base: basePrice,
          discountPercent: values.ruleType === 'PERCENT' ? Number(values.discountPercent ?? 0) : 0,
          source: 'group_rule_catalog',
          groupName: group.name,
        };
      }
    }

    if (!group.defaultEnabled) {
      return {
        price: basePrice,
        base: basePrice,
        discountPercent: 0,
        source: 'retail',
        groupName: group.name,
      };
    }

    const globalValues = globalRuleFromGroup(group);
    const adjustmentType = globalValues.ruleType;

    if (adjustmentType === 'FIXED') {
      const delta = Number(globalValues.fixedAdjustment ?? 0);
      if (!Number.isFinite(delta) || delta === 0) {
        return {
          price: basePrice,
          base: basePrice,
          discountPercent: 0,
          source: 'retail',
          groupName: group.name,
        };
      }
      return {
        price: applyPriceRule(basePrice, globalValues),
        base: basePrice,
        discountPercent: 0,
        source: 'group_fixed',
        groupName: group.name,
      };
    }

    const percent = Number(globalValues.discountPercent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) {
      return {
        price: basePrice,
        base: basePrice,
        discountPercent: 0,
        source: 'retail',
        groupName: group.name,
      };
    }

    return {
      price: applyPriceRule(basePrice, globalValues),
      base: basePrice,
      discountPercent: Math.max(0, Math.min(50, percent)),
      source: 'group_percent',
      groupName: group.name,
    };
  } catch (e) {
    console.error('[pricing] resolve failed; falling back to retail', e);
    return {
      price: basePrice,
      base: basePrice,
      discountPercent: 0,
      source: 'retail',
      groupName: null,
    };
  }
}
