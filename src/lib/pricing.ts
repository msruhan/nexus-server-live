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

type PriceGroupSnapshot = {
  id: string;
  name: string;
  isActive: boolean;
  defaultEnabled: boolean;
  adjustmentType: string;
  discountPercent: unknown;
  fixedAdjustment: unknown;
};

type RuleIndex = {
  imeiService: Map<string, PriceRuleValues>;
  serverService: Map<string, PriceRuleValues>;
  imeiGroup: Map<string, PriceRuleValues>;
  serverBox: Map<string, PriceRuleValues>;
};

function buildRuleIndex(
  rows: {
    scope: string;
    imeiGroupId: string | null;
    serverBoxId: string | null;
    imeiServiceId: string | null;
    serverServiceId: string | null;
    ruleType: string;
    discountPercent: unknown;
    fixedAdjustment: unknown;
    absolutePrice: unknown;
  }[],
): RuleIndex {
  const index: RuleIndex = {
    imeiService: new Map(),
    serverService: new Map(),
    imeiGroup: new Map(),
    serverBox: new Map(),
  };
  for (const row of rows) {
    const values = ruleValuesFromRow(row);
    if (row.imeiServiceId) index.imeiService.set(row.imeiServiceId, values);
    if (row.serverServiceId) index.serverService.set(row.serverServiceId, values);
    if (row.imeiGroupId) index.imeiGroup.set(row.imeiGroupId, values);
    if (row.serverBoxId) index.serverBox.set(row.serverBoxId, values);
  }
  return index;
}

function resolvePriceInMemory(
  group: PriceGroupSnapshot | null,
  rules: RuleIndex,
  args: {
    kind: ServiceKind;
    serviceId: string;
    catalogGroupId: string;
    basePrice: Decimal;
  },
): ResolvedPrice {
  const { kind, serviceId, catalogGroupId, basePrice } = args;

  if (!group?.isActive) {
    return {
      price: basePrice,
      base: basePrice,
      discountPercent: 0,
      source: 'retail',
      groupName: null,
    };
  }

  const serviceRule =
    kind === 'imei' ? rules.imeiService.get(serviceId) : rules.serverService.get(serviceId);
  if (serviceRule) {
    return {
      price: applyPriceRule(basePrice, serviceRule),
      base: basePrice,
      discountPercent:
        serviceRule.ruleType === 'PERCENT' ? Number(serviceRule.discountPercent ?? 0) : 0,
      source: 'group_rule_service',
      groupName: group.name,
    };
  }

  const catalogRule =
    kind === 'imei'
      ? rules.imeiGroup.get(catalogGroupId)
      : rules.serverBox.get(catalogGroupId);
  if (catalogRule) {
    return {
      price: applyPriceRule(basePrice, catalogRule),
      base: basePrice,
      discountPercent:
        catalogRule.ruleType === 'PERCENT' ? Number(catalogRule.discountPercent ?? 0) : 0,
      source: 'group_rule_catalog',
      groupName: group.name,
    };
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
  if (globalValues.ruleType === 'FIXED') {
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
}

export function formatResolvedPriceSource(source: ResolvedPrice['source']): string {
  switch (source) {
    case 'group_rule_service':
      return 'Per-service rule';
    case 'group_rule_catalog':
      return 'Catalog group rule';
    case 'group_percent':
      return 'Group default (%)';
    case 'group_fixed':
      return 'Group default (±)';
    case 'group_override':
      return 'Fixed override';
    default:
      return 'Retail';
  }
}

export type UserServicePriceRow = {
  kind: ServiceKind;
  serviceId: string;
  title: string;
  ref: string | null;
  catalogTitle: string;
  retailPrice: number;
  userPrice: number;
  source: ResolvedPrice['source'];
  sourceLabel: string;
  groupName: string | null;
  adjusted: boolean;
};

export async function listResolvedServicePricesForUser(userId: string): Promise<{
  groupName: string | null;
  rows: UserServicePriceRow[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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

  const group = user?.priceGroup?.isActive ? user.priceGroup : null;
  const rules = group
    ? buildRuleIndex(
        await prisma.priceGroupRule.findMany({
          where: { priceGroupId: group.id },
        }),
      )
    : buildRuleIndex([]);

  const [imeiServices, serverServices] = await Promise.all([
    prisma.imeiService.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        toolId: true,
        price: true,
        groupId: true,
        group: { select: { title: true } },
      },
      orderBy: [{ group: { title: 'asc' } }, { title: 'asc' }],
    }),
    prisma.serverService.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        toolId: true,
        price: true,
        boxId: true,
        box: { select: { title: true } },
      },
      orderBy: [{ box: { title: 'asc' } }, { title: 'asc' }],
    }),
  ]);

  const rows: UserServicePriceRow[] = [];

  for (const svc of imeiServices) {
    const basePrice = new Prisma.Decimal(svc.price);
    const resolved = resolvePriceInMemory(group, rules, {
      kind: 'imei',
      serviceId: svc.id,
      catalogGroupId: svc.groupId,
      basePrice,
    });
    const retailPrice = Number(basePrice);
    const userPrice = Number(resolved.price);
    rows.push({
      kind: 'imei',
      serviceId: svc.id,
      title: svc.title,
      ref: svc.toolId,
      catalogTitle: svc.group.title,
      retailPrice,
      userPrice,
      source: resolved.source,
      sourceLabel: formatResolvedPriceSource(resolved.source),
      groupName: resolved.groupName,
      adjusted: Math.abs(userPrice - retailPrice) > 0.001,
    });
  }

  for (const svc of serverServices) {
    const basePrice = new Prisma.Decimal(svc.price);
    const resolved = resolvePriceInMemory(group, rules, {
      kind: 'server',
      serviceId: svc.id,
      catalogGroupId: svc.boxId,
      basePrice,
    });
    const retailPrice = Number(basePrice);
    const userPrice = Number(resolved.price);
    rows.push({
      kind: 'server',
      serviceId: svc.id,
      title: svc.title,
      ref: svc.toolId,
      catalogTitle: svc.box.title,
      retailPrice,
      userPrice,
      source: resolved.source,
      sourceLabel: formatResolvedPriceSource(resolved.source),
      groupName: resolved.groupName,
      adjusted: Math.abs(userPrice - retailPrice) > 0.001,
    });
  }

  return { groupName: group?.name ?? null, rows };
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

    const group = user?.priceGroup?.isActive ? user.priceGroup : null;
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

    if (!catalogGroupId) {
      return {
        price: basePrice,
        base: basePrice,
        discountPercent: 0,
        source: 'retail',
        groupName: group?.name ?? null,
      };
    }

    const rules = group
      ? buildRuleIndex(
          await prisma.priceGroupRule.findMany({
            where: { priceGroupId: group.id },
          }),
        )
      : buildRuleIndex([]);

    return resolvePriceInMemory(group, rules, {
      kind,
      serviceId,
      catalogGroupId,
      basePrice,
    });
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
