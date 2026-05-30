/**
 * Tiered pricing resolution.
 *
 * Single source of truth for "what does THIS user pay for THIS service?".
 * Used by:
 *   - /api/imei/orders            (user-facing order placement)
 *   - /api/imei/server-orders
 *   - /api/public/v1/orders/imei  (reseller API)
 *   - /api/public/v1/orders/server
 *   - /api/index.php              (Dhru-compat reseller API)
 *
 * Rules of resolution (in order):
 *   1. If the user has a PriceGroup with a ServicePriceOverride for this
 *      specific service → use override.price (per-row override).
 *   2. Else if the user has a PriceGroup with adjustmentType FIXED →
 *      retail + fixedAdjustment (e.g. -5 or +5 USD), floored at 0.
 *   3. Else if adjustmentType PERCENT and discountPercent > 0 →
 *      apply percent off retail, ROUND DOWN to 2 decimal places (USD).
 *   4. Else → return service.price unchanged.
 *
 * Defensive defaults:
 *   - User without group: returns service.price (no DB lookup beyond user).
 *   - Errors anywhere in this function: callers catch and fall back to
 *     service.price. Tiered pricing is a "nice extra" — if it ever breaks,
 *     the user just pays full retail. NEVER fail order placement because
 *     of pricing resolution.
 */
import { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/db';

export type ServiceKind = 'imei' | 'server';

export type ResolvedPrice = {
  price: Decimal;
  base: Decimal;
  discountPercent: number; // 0 if no group / override path
  source: 'retail' | 'group_percent' | 'group_fixed' | 'group_override';
  groupName: string | null;
};

function multiplyByPercentDown(base: Decimal, percent: number): Decimal {
  // base * (100 - percent) / 100, rounded down to 2 decimal places (USD cents).
  const factor = new Prisma.Decimal((100 - percent) / 100);
  const product = base.mul(factor);
  // Round down to 2 decimal places.
  return product.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
}

export async function resolveServicePriceForUser(args: {
  userId: string;
  serviceId: string;
  kind: ServiceKind;
  basePrice: Decimal;
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

    // Per-service override?
    const override = await prisma.servicePriceOverride.findFirst({
      where: {
        priceGroupId: user.priceGroup.id,
        ...(kind === 'imei' ? { imeiServiceId: serviceId } : { serverServiceId: serviceId }),
      },
      select: { price: true },
    });
    if (override) {
      return {
        price: override.price,
        base: basePrice,
        discountPercent: 0,
        source: 'group_override',
        groupName: user.priceGroup.name,
      };
    }

    const adjustmentType = user.priceGroup.adjustmentType === 'FIXED' ? 'FIXED' : 'PERCENT';

    if (adjustmentType === 'FIXED') {
      const delta = Number(user.priceGroup.fixedAdjustment ?? 0);
      if (!Number.isFinite(delta) || delta === 0) {
        return {
          price: basePrice,
          base: basePrice,
          discountPercent: 0,
          source: 'retail',
          groupName: user.priceGroup.name,
        };
      }
      const summed = basePrice.add(new Prisma.Decimal(delta)).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
      const price = summed.lessThan(0) ? new Prisma.Decimal(0) : summed;
      return {
        price,
        base: basePrice,
        discountPercent: 0,
        source: 'group_fixed',
        groupName: user.priceGroup.name,
      };
    }

    // Group-wide percent discount
    const percent = Number(user.priceGroup.discountPercent ?? 0);
    if (!Number.isFinite(percent) || percent <= 0) {
      return {
        price: basePrice,
        base: basePrice,
        discountPercent: 0,
        source: 'retail',
        groupName: user.priceGroup.name,
      };
    }
    const clamped = Math.max(0, Math.min(50, percent));
    const next = multiplyByPercentDown(basePrice, clamped);
    return {
      price: next,
      base: basePrice,
      discountPercent: clamped,
      source: 'group_percent',
      groupName: user.priceGroup.name,
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
