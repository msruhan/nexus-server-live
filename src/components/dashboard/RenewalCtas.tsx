/**
 * Portal renewal deep links (from validate API). Shown when runtime is locked
 * but Portal is reachable — not for grace_period_exceeded.
 */
export function RenewalCtas({
  checkoutUrl,
  deskUrl,
  compact = false,
}: {
  checkoutUrl: string | null | undefined;
  deskUrl?: string | null;
  compact?: boolean;
}) {
  if (!checkoutUrl) return null;

  const btn =
    compact
      ? 'rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100'
      : 'rounded-lg bg-ink px-4 py-2 text-xs font-bold text-paper transition-opacity hover:opacity-90';

  const secondary =
    compact
      ? 'rounded-lg border border-red-200 bg-red-50/80 px-3 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100'
      : 'rounded-lg border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-200';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-3'}`}>
      <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className={btn}>
        Renew now
      </a>
      {deskUrl ? (
        <a href={deskUrl} target="_blank" rel="noopener noreferrer" className={secondary}>
          Customer Desk
        </a>
      ) : null}
    </div>
  );
}

export function showRenewalCtas(
  reason: string | null | undefined,
  checkoutUrl: string | null | undefined,
): checkoutUrl is string {
  return !!checkoutUrl && reason !== 'grace_period_exceeded';
}
