export type CurrencyRates = Record<string, number>;

export function parseCurrencyRates(raw: string | null | undefined): CurrencyRates {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as CurrencyRates;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function convertFromUsd(
  amountUsd: number,
  targetCurrency: string,
  rates: CurrencyRates,
): number {
  if (targetCurrency === 'USD') return amountUsd;
  const rate = rates[targetCurrency];
  if (!rate || rate <= 0) return amountUsd;
  return Math.round(amountUsd * rate * 100) / 100;
}

export function formatMoney(
  amountUsd: number,
  currency = 'USD',
  rates: CurrencyRates = {},
): string {
  const value = convertFromUsd(amountUsd, currency, rates);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
