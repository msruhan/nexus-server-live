import { CheckCircle, ClockCountdown, Package, XCircle } from '@phosphor-icons/react/dist/ssr';
import type { PublicOrderTrack } from '@/lib/order-tracker';

function fmt(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string; Icon: typeof CheckCircle }> = {
    PENDING: { tone: 'bg-zinc-100 text-zinc-700 ring-zinc-200', label: 'Pending', Icon: ClockCountdown },
    IN_PROCESS: { tone: 'bg-blue-100 text-blue-800 ring-blue-200', label: 'In process', Icon: Package },
    SUCCESS: { tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200', label: 'Completed', Icon: CheckCircle },
    REJECTED: { tone: 'bg-red-100 text-red-800 ring-red-200', label: 'Rejected', Icon: XCircle },
    CANCELLED: { tone: 'bg-zinc-200 text-zinc-700 ring-zinc-300', label: 'Cancelled', Icon: XCircle },
  };
  const c = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${c.tone}`}
    >
      <c.Icon size={14} weight="bold" />
      {c.label}
    </span>
  );
}

export function TrackResult({ result }: { result: PublicOrderTrack }) {
  return (
    <article className="space-y-6 rounded-2xl border border-line bg-paper-50 p-6">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            § Order
          </div>
          <h2 className="mt-1 font-mono text-xl font-bold tracking-tight text-ink">
            {result.orderCode}
          </h2>
          <p className="mt-2 font-serif text-sm italic text-ink-muted">
            {result.serviceTitle}
            {result.groupTitle ? ` · ${result.groupTitle}` : ''}
          </p>
        </div>
        <StatusBadge status={result.status} />
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">{result.kind === 'imei' ? 'IMEI service' : 'Server service'}</Field>
        <Field label="Owner">{result.ownerInitial} ·</Field>
        {result.deviceMasked && <Field label="Device">{result.deviceMasked}</Field>}
        <Field label="Created">{fmt(result.createdAt)}</Field>
        {result.processedAt && <Field label="Processed">{fmt(result.processedAt)}</Field>}
        {result.completedAt && <Field label="Completed">{fmt(result.completedAt)}</Field>}
      </dl>

      {result.status === 'SUCCESS' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
            § Result
          </div>
          {result.supplierCode ? (
            <p className="mt-2 break-all font-mono text-sm text-emerald-900">
              {result.supplierCode}
            </p>
          ) : (
            <p className="mt-2 font-serif italic text-emerald-800">
              Result is available — sign in to your account to retrieve it.
            </p>
          )}
          {result.hasResultFile && (
            <p className="mt-2 text-xs text-emerald-800">
              A result file is attached to this order. Sign in to download.
            </p>
          )}
        </div>
      )}

      {result.status === 'REJECTED' && result.supplierComments && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-700">
            § Rejection note
          </div>
          <p className="mt-2 font-serif italic text-red-900">{result.supplierComments}</p>
        </div>
      )}

      {(result.status === 'PENDING' || result.status === 'IN_PROCESS') && (
        <div className="rounded-xl border border-line bg-paper p-4 font-serif text-sm italic text-ink-muted">
          Status auto-refreshes whenever the supplier posts an update. Sign in for richer
          detail and notifications.
        </div>
      )}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{children}</dd>
    </div>
  );
}
