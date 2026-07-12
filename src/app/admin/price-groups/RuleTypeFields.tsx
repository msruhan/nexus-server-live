'use client';

import { Input } from '@/components/ui/Input';
import type { PriceRuleType } from '@/lib/price-group-rule';

export function RuleTypeFields({
  ruleType,
  onRuleType,
  discountPercent,
  onDiscountPercent,
  fixedAdjustment,
  onFixedAdjustment,
  absolutePrice,
  onAbsolutePrice,
}: {
  ruleType: PriceRuleType;
  onRuleType: (v: PriceRuleType) => void;
  discountPercent: string;
  onDiscountPercent: (v: string) => void;
  fixedAdjustment: string;
  onFixedAdjustment: (v: string) => void;
  absolutePrice: string;
  onAbsolutePrice: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['PERCENT', 'Percentage (%)'],
            ['FIXED', '± USD'],
            ['ABSOLUTE', 'Fixed price'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onRuleType(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              ruleType === key ? 'bg-ink text-paper' : 'border border-line text-ink/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {ruleType === 'PERCENT' && (
        <Input
          label="Discount %"
          type="number"
          min={0}
          max={50}
          step={0.5}
          value={discountPercent}
          onChange={(e) => onDiscountPercent(e.target.value)}
          hint="10 = 10% off retail"
          required
        />
      )}
      {ruleType === 'FIXED' && (
        <Input
          label="Adjustment (USD)"
          type="number"
          step={0.01}
          value={fixedAdjustment}
          onChange={(e) => onFixedAdjustment(e.target.value)}
          hint="Negative = cheaper (e.g. -5)"
          required
        />
      )}
      {ruleType === 'ABSOLUTE' && (
        <Input
          label="Group price (USD)"
          type="number"
          min={0.01}
          step={0.01}
          value={absolutePrice}
          onChange={(e) => onAbsolutePrice(e.target.value)}
          required
        />
      )}
    </div>
  );
}

export function buildRulePayload(
  ruleType: PriceRuleType,
  discountPercent: string,
  fixedAdjustment: string,
  absolutePrice: string,
) {
  if (ruleType === 'PERCENT') return { ruleType, discountPercent: Number(discountPercent) };
  if (ruleType === 'FIXED') return { ruleType, fixedAdjustment: Number(fixedAdjustment) };
  return { ruleType, absolutePrice: Number(absolutePrice) };
}
