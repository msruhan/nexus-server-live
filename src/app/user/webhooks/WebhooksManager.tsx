'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash,
  PaperPlaneTilt,
  ArrowsClockwise,
  Copy,
  Check,
  ListBullets,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type EventDef = { key: string; label: string; description: string };

type Endpoint = {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  events: string[];
  secretMasked: string;
  lastStatus: string | null;
  lastDeliveryAt: string | null;
  failureCount: number;
  deliveryCount: number;
  createdAt: string;
};

type Delivery = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  responseCode: number | null;
  error: string | null;
  refType: string | null;
  refId: string | null;
  deliveredAt: string | null;
  createdAt: string;
  nextAttemptAt: string;
};

export function WebhooksManager({
  initialEndpoints,
  availableEvents,
}: {
  initialEndpoints: Endpoint[];
  availableEvents: EventDef[];
}) {
  const router = useRouter();
  const [endpoints, setEndpoints] = React.useState(initialEndpoints);
  const [showCreate, setShowCreate] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<{ id: string; secret: string } | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await fetch('/api/user/webhooks');
    if (res.ok) {
      const data = await res.json();
      setEndpoints(data.endpoints);
    }
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Intro / docs hint */}
      <div className="rounded-2xl border border-line bg-paper-50 p-5">
        <p className="text-sm text-ink-muted">
          We POST a JSON payload to your URL when a subscribed event fires. Each request includes an{' '}
          <code className="rounded bg-paper-200 px-1 font-mono text-xs">X-Nexus-Signature</code> header
          (HMAC-SHA256 of <code className="rounded bg-paper-200 px-1 font-mono text-xs">{'{timestamp}.{body}'}</code>).
          Verify it with your signing secret to confirm authenticity.
        </p>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Endpoints <span className="font-mono text-sm text-ink-soft">({endpoints.length})</span>
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-bold text-paper hover:opacity-90"
        >
          <Plus size={14} weight="bold" /> Add endpoint
        </button>
      </div>

      {/* Newly created secret banner */}
      <AnimatePresence>
        {revealedSecret && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-amber-300 bg-amber-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-900">Signing secret (shown once)</div>
                <p className="mt-1 text-xs text-amber-800">
                  Store this securely. You won&rsquo;t be able to see it again — only rotate it.
                </p>
                <SecretCopy secret={revealedSecret.secret} />
              </div>
              <button
                onClick={() => setRevealedSecret(null)}
                className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100"
                aria-label="Dismiss"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {endpoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-50 py-14 text-center">
          <p className="font-serif italic text-ink-muted">
            No webhook endpoints yet. Add one to start receiving callbacks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              availableEvents={availableEvents}
              onChange={refresh}
              onSecret={(secret) => setRevealedSecret({ id: ep.id, secret })}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            availableEvents={availableEvents}
            onClose={() => setShowCreate(false)}
            onCreated={(secret) => {
              setShowCreate(false);
              setRevealedSecret({ id: 'new', secret });
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SecretCopy({ secret }: { secret: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-ink">
        {secret}
      </code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(secret);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-amber-50"
      >
        {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function EndpointCard({
  endpoint,
  availableEvents,
  onChange,
  onSecret,
}: {
  endpoint: Endpoint;
  availableEvents: EventDef[];
  onChange: () => void;
  onSecret: (secret: string) => void;
}) {
  const confirmDialog = useConfirm();
  const [busy, setBusy] = React.useState(false);
  const [showLog, setShowLog] = React.useState(false);
  const [deliveries, setDeliveries] = React.useState<Delivery[] | null>(null);
  const deliveriesPagination = useTablePagination(deliveries ?? [], [deliveries?.length ?? 0]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/user/webhooks/${endpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { res, data };
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const { res } = await act({ action: 'update', isActive: !endpoint.isActive });
    if (res.ok) {
      toast.success(endpoint.isActive ? 'Endpoint paused' : 'Endpoint activated');
      onChange();
    } else toast.error('Update failed');
  };

  const testEndpoint = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/user/webhooks/${endpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json();
      if (data.ok) toast.success(`Test delivered — HTTP ${data.status}`);
      else toast.error(`Test failed — ${data.error ?? `HTTP ${data.status}`}`);
    } catch {
      toast.error('Test failed');
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    const ok = await confirmDialog({
      title: 'Rotate signing secret',
      description: 'Rotate the signing secret? Your current secret will stop working immediately.',
      confirmLabel: 'Rotate',
      tone: 'warning',
    });
    if (!ok) return;
    const { res, data } = await act({ action: 'rotate' });
    if (res.ok && data.secret) {
      onSecret(data.secret);
      toast.success('Secret rotated');
    } else toast.error('Rotate failed');
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: 'Delete webhook endpoint',
      description: `Delete endpoint "${endpoint.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/user/webhooks/${endpoint.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Endpoint deleted');
        onChange();
      } else toast.error('Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const loadLog = async () => {
    setShowLog((s) => !s);
    if (deliveries === null) {
      const res = await fetch(`/api/user/webhooks/${endpoint.id}/deliveries`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                endpoint.isActive ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
            <span className="font-display font-bold text-ink">{endpoint.name}</span>
            {endpoint.lastStatus && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  endpoint.lastStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {endpoint.lastStatus}
              </span>
            )}
          </div>
          <div className="mt-1 truncate font-mono text-xs text-ink-muted">{endpoint.url}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {endpoint.events.length === 0 ? (
              <span className="rounded-full bg-paper-200 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                all events
              </span>
            ) : (
              endpoint.events.map((e) => (
                <span key={e} className="rounded-full bg-paper-200 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                  {e}
                </span>
              ))
            )}
          </div>
          <div className="mt-2 font-mono text-[10px] text-ink-soft">
            secret {endpoint.secretMasked} · {endpoint.deliveryCount} deliveries
            {endpoint.failureCount > 0 && ` · ${endpoint.failureCount} consecutive failures`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <IconBtn onClick={testEndpoint} disabled={busy} title="Send test event">
            <PaperPlaneTilt size={14} weight="bold" />
          </IconBtn>
          <IconBtn onClick={loadLog} disabled={busy} title="Delivery log">
            <ListBullets size={14} weight="bold" />
          </IconBtn>
          <IconBtn onClick={rotate} disabled={busy} title="Rotate secret">
            <ArrowsClockwise size={14} weight="bold" />
          </IconBtn>
          <button
            onClick={toggleActive}
            disabled={busy}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
              endpoint.isActive
                ? 'border-line bg-paper text-ink hover:bg-paper-200'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {endpoint.isActive ? 'Pause' : 'Activate'}
          </button>
          <IconBtn onClick={remove} disabled={busy} title="Delete" danger>
            <Trash size={14} weight="bold" />
          </IconBtn>
        </div>
      </div>

      {/* Delivery log */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line bg-paper-100 text-left font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Attempts</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {deliveries === null ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-ink-muted">Loading…</td>
                    </tr>
                  ) : deliveriesPagination.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-ink-muted">No deliveries yet.</td>
                    </tr>
                  ) : (
                    deliveriesPagination.pageRows.map((d) => (
                      <tr key={d.id} className="border-b border-line last:border-0">
                        <td className="px-3 py-2 font-mono text-[10px] text-ink-muted">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono">{d.event}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              d.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                            title={d.error ?? ''}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-ink-muted">{d.responseCode ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-ink-muted">
                          {d.attempts}/{d.maxAttempts}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {d.status === 'FAILED' && (
                            <RetryButton endpointId={endpoint.id} deliveryId={d.id} onDone={loadLog} />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {deliveries && deliveries.length > 0 && (
              <TablePagination
                currentPage={deliveriesPagination.currentPage}
                pageCount={deliveriesPagination.pageCount}
                totalItems={deliveries.length}
                onPageChange={deliveriesPagination.setPage}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RetryButton({ endpointId, deliveryId, onDone }: { endpointId: string; deliveryId: string; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/user/webhooks/${endpointId}/deliveries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryId }),
          });
          const data = await res.json();
          if (data.ok) {
            toast.success('Retried');
            // reload the log (toggle twice keeps it open + refetches)
            onDone();
            onDone();
          } else toast.error('Retry failed');
        } finally {
          setBusy(false);
        }
      }}
      className="rounded border border-line bg-paper px-2 py-1 text-[10px] font-bold text-ink hover:bg-paper-200 disabled:opacity-50"
    >
      {busy ? '…' : 'Retry'}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
        danger
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-line bg-paper text-ink hover:bg-paper-200'
      }`}
    >
      {children}
    </button>
  );
}

function CreateModal({
  availableEvents,
  onClose,
  onCreated,
}: {
  availableEvents: EventDef[];
  onClose: () => void;
  onCreated: (secret: string) => void;
}) {
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [events, setEvents] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const toggle = (key: string) =>
    setEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const submit = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/user/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, events }),
      });
      const data = await res.json();
      if (res.ok && data.secret) {
        toast.success('Endpoint created');
        onCreated(data.secret);
      } else {
        toast.error(data.error ?? 'Create failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        className="relative w-full max-w-lg rounded-2xl border border-line bg-paper p-6 shadow-card-hover"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">New webhook endpoint</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-paper-200">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production callback"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Endpoint URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com/api/nexus-callback"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <p className="mt-1 text-xs text-ink-muted">HTTPS only. Private/internal addresses are blocked.</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Events</label>
              <span className="text-[10px] text-ink-soft">Leave all unchecked = subscribe to everything</span>
            </div>
            <div className="mt-2 space-y-2">
              {availableEvents.map((ev) => (
                <label key={ev.key} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={events.includes(ev.key)}
                    onChange={() => toggle(ev.key)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
                  />
                  <span className="leading-tight">
                    <span className="block font-mono text-xs font-medium text-ink">{ev.key}</span>
                    <span className="block text-[11px] text-ink-muted">{ev.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-ink px-5 py-2 text-sm font-bold text-paper hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create endpoint'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
