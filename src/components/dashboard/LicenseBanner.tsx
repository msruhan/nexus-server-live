import Link from 'next/link';

/**
 * Shown across the admin dashboard when the license is no longer active
 * (revoked / expired / suspended by the vendor, or grace period exceeded).
 *
 * This is the visible half of the "soft revoke" strategy: the background
 * scheduler + on-open re-validation flip licenseStatus to `inactive`, and
 * this banner makes that state obvious without destroying local data.
 */
const REASON_LABELS: Record<string, string> = {
  revoked: 'Your license has been revoked by the vendor.',
  suspended: 'Your license has been suspended. Please contact support.',
  expired: 'Your license has expired. Renew it to continue receiving updates.',
  domain_mismatch: 'This license is bound to a different domain.',
  invalid_key: 'The stored license key is no longer recognized.',
  grace_period_exceeded:
    'The License Server has been unreachable for over 7 days, so this installation is now locked.',
  hold: 'Subscription on hold — renew with your vendor, then release hold in Recovero Portal.',
  validation_failed: 'License validation failed.',
};

export function LicenseBanner({
  status,
  reason,
  systemHref = '/admin/system',
}: {
  status: string;
  reason: string | null;
  systemHref?: string;
}) {
  if (status === 'active' || status === 'not_activated') return null;

  const message =
    (reason && REASON_LABELS[reason]) ??
    'Your license is no longer active. Updates and support are paused until it is reactivated.';

  return (
    <div className="border-b border-red-200 bg-red-50">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-8">
        <div className="flex items-center gap-2 text-sm text-red-800">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-[11px] font-bold text-white">
            !
          </span>
          <span className="font-medium">{message}</span>
        </div>
        <Link
          href={systemHref}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          Manage license →
        </Link>
      </div>
    </div>
  );
}
