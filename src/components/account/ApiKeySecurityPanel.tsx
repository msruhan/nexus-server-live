'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Lock, LockOpen, Shield, ArrowClockwise } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';

type IpMode = 'none' | 'allowlist' | 'lock_first';

type SecurityState = {
  id: string;
  name: string;
  ipMode: IpMode;
  allowedIps: string | null;
  lockedIp: string | null;
  lockedAt: string | null;
  lockedByUa: string | null;
  rateLimitPerMinute: number | null;
  rateLimitPerHour: number | null;
  spendLimitPerHour: string | null;
  spendLimitPerDay: string | null;
  maxOrdersPerHour: number | null;
  consecutiveFails: number;
  throttleUntil: string | null;
};

type AttemptRow = {
  id: string;
  outcome:
    | 'ALLOWED'
    | 'REJECTED_IP'
    | 'REJECTED_SCOPE'
    | 'REJECTED_RATE'
    | 'REJECTED_SPEND'
    | 'REJECTED_AUTH'
    | 'REJECTED_THROTTLE';
  reason: string | null;
  ip: string | null;
  ipCountry: string | null;
  userAgent: string | null;
  action: string | null;
  createdAt: string;
};

function fmt(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

function outcomeStyle(outcome: AttemptRow['outcome']) {
  if (outcome === 'ALLOWED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-red-100 text-red-800';
}

export function ApiKeySecurityPanel({ keyId, onChanged }: { keyId: string; onChanged?: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<SecurityState | null>(null);
  const [attempts, setAttempts] = React.useState<AttemptRow[]>([]);
  const attemptsPagination = useTablePagination(attempts, [attempts.length]);
  const [showAttempts, setShowAttempts] = React.useState(false);

  // Local form state mirrors server, edited as strings to allow empty = "no limit".
  const [ipMode, setIpMode] = React.useState<IpMode>('none');
  const [allowedIps, setAllowedIps] = React.useState('');
  const [rpm, setRpm] = React.useState('');
  const [rph, setRph] = React.useState('');
  const [sphr, setSphr] = React.useState('');
  const [spdy, setSpdy] = React.useState('');
  const [mph, setMph] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/user/api-keys/${keyId}/security`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to load security settings', { description: json.error });
      return;
    }
    const d = json.data as SecurityState;
    setData(d);
    setIpMode(d.ipMode);
    setAllowedIps(d.allowedIps ?? '');
    setRpm(d.rateLimitPerMinute?.toString() ?? '');
    setRph(d.rateLimitPerHour?.toString() ?? '');
    setSphr(d.spendLimitPerHour ?? '');
    setSpdy(d.spendLimitPerDay ?? '');
    setMph(d.maxOrdersPerHour?.toString() ?? '');
  }, [keyId]);

  const loadAttempts = React.useCallback(async () => {
    const res = await fetch(`/api/user/api-keys/${keyId}/attempts?limit=50`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to load attempt log', { description: json.error });
      return;
    }
    setAttempts(json.data ?? []);
  }, [keyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (showAttempts) void loadAttempts();
  }, [showAttempts, loadAttempts]);

  function toIntOrNull(value: string): number | null {
    if (!value.trim()) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      ipMode,
      allowedIps: ipMode === 'allowlist' ? allowedIps.trim() || null : null,
      rateLimitPerMinute: toIntOrNull(rpm),
      rateLimitPerHour: toIntOrNull(rph),
      spendLimitPerHour: toIntOrNull(sphr),
      spendLimitPerDay: toIntOrNull(spdy),
      maxOrdersPerHour: toIntOrNull(mph),
    };
    const res = await fetch(`/api/user/api-keys/${keyId}/security`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save settings', { description: json.error });
      return;
    }
    toast.success('Security settings updated');
    await load();
    onChanged?.();
  }

  async function releaseLock() {
    const res = await fetch(`/api/user/api-keys/${keyId}/release-lock`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to release lock', { description: json.error });
      return;
    }
    toast.success('IP lock released');
    await load();
    onChanged?.();
  }

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-line bg-paper-50 p-5 text-sm text-ink-muted">
        Loading security settings…
      </div>
    );
  }

  const isThrottled = data.throttleUntil && new Date(data.throttleUntil).getTime() > Date.now();

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-paper-50 p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-ink" />
          <h4 className="font-display font-extrabold tracking-tight text-ink">Security policy</h4>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            <ArrowClockwise size={14} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* IP mode */}
      <section className="space-y-3">
        <div>
          <h5 className="text-sm font-semibold text-ink">IP policy</h5>
          <p className="mt-0.5 text-xs text-ink-muted">
            Restrict which IPs can use this key. <span className="italic">Default mode "None" preserves
            current behavior — request from any IP is accepted.</span>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['none', 'lock_first', 'allowlist'] as IpMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setIpMode(m)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                ipMode === m
                  ? 'border-ink bg-ink/5'
                  : 'border-line bg-paper hover:border-ink/40'
              }`}
            >
              <div className="text-sm font-semibold text-ink">
                {m === 'none' && 'None (open)'}
                {m === 'lock_first' && 'Lock to first IP'}
                {m === 'allowlist' && 'IP allowlist'}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {m === 'none' && 'Accept request from any IP.'}
                {m === 'lock_first' && 'Auto-bind to the first IP that uses the key. Subsequent requests from a different IP are rejected until the lock is released.'}
                {m === 'allowlist' && 'Accept only one IP / CIDR you register below.'}
              </div>
            </button>
          ))}
        </div>

        {ipMode === 'lock_first' && (
          <div className="rounded-xl border border-line bg-paper p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {data.lockedIp ? (
                    <Lock size={16} className="text-emerald-700" />
                  ) : (
                    <LockOpen size={16} className="text-ink-muted" />
                  )}
                  <span className="font-mono text-sm font-bold">
                    {data.lockedIp ? data.lockedIp : 'Not locked yet'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {data.lockedAt
                    ? `Locked at ${fmt(data.lockedAt)}`
                    : 'Will lock on the next successful API call.'}
                </div>
                {data.lockedByUa && (
                  <div className="mt-1 truncate text-[11px] font-mono text-ink-muted">
                    UA: {data.lockedByUa}
                  </div>
                )}
              </div>
              {data.lockedIp && (
                <Button type="button" size="sm" variant="outline" onClick={() => void releaseLock()}>
                  Release lock
                </Button>
              )}
            </div>
          </div>
        )}

        {ipMode === 'allowlist' && (
          <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
            {allowedIps.trim() ? (
              <>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Allowed IP</p>
                  <p className="mt-1 font-mono text-sm font-bold text-ink">{allowedIps.trim()}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    One IP per key. Clear it before registering a different address.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllowedIps('')}
                >
                  Clear allowlist
                </Button>
              </>
            ) : (
              <Input
                label="Allowed IP / CIDR"
                placeholder="203.0.113.45"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                hint="Single IPv4, IPv4 CIDR, or IPv6. Save to apply."
              />
            )}
          </div>
        )}
      </section>

      {/* Rate limits */}
      <section className="space-y-3 border-t border-line pt-4">
        <div>
          <h5 className="text-sm font-semibold text-ink">Rate limit</h5>
          <p className="mt-0.5 text-xs text-ink-muted">
            Cap how many calls this key can make. Empty = no limit.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Per minute"
            placeholder="e.g. 60"
            type="number"
            min={0}
            value={rpm}
            onChange={(e) => setRpm(e.target.value)}
          />
          <Input
            label="Per hour"
            placeholder="e.g. 2000"
            type="number"
            min={0}
            value={rph}
            onChange={(e) => setRph(e.target.value)}
          />
        </div>
      </section>

      {/* Spend limits */}
      <section className="space-y-3 border-t border-line pt-4">
        <div>
          <h5 className="text-sm font-semibold text-ink">Spend limit (IDR)</h5>
          <p className="mt-0.5 text-xs text-ink-muted">
            Financial circuit breaker. Caps how much this key can spend in a window. Empty = no limit.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Per hour"
            placeholder="e.g. 500000"
            type="number"
            min={0}
            value={sphr}
            onChange={(e) => setSphr(e.target.value)}
          />
          <Input
            label="Per day"
            placeholder="e.g. 5000000"
            type="number"
            min={0}
            value={spdy}
            onChange={(e) => setSpdy(e.target.value)}
          />
          <Input
            label="Max orders / hour"
            placeholder="e.g. 100"
            type="number"
            min={0}
            value={mph}
            onChange={(e) => setMph(e.target.value)}
          />
        </div>
        <p className="text-[11px] italic text-ink-muted">
          Note: spend &amp; max-orders enforcement is staged for the next release; current build only
          stores the values. Rate &amp; IP policy are active.
        </p>
      </section>

      {/* Throttle status */}
      {(isThrottled || data.consecutiveFails > 0) && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {isThrottled ? (
            <>
              ⚠ Key is currently throttled until <strong>{fmt(data.throttleUntil)}</strong> due to
              repeated failures.
            </>
          ) : (
            <>
              {data.consecutiveFails} consecutive failure{data.consecutiveFails > 1 ? 's' : ''} since
              last success.
            </>
          )}
        </section>
      )}

      {/* Attempt log */}
      <section className="border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setShowAttempts((v) => !v)}
          className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          {showAttempts ? '▾ Hide attempt log' : '▸ Show recent attempts'}
        </button>
        {showAttempts && (
          <>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-paper-100 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Outcome</th>
                  <th className="px-3 py-2 text-left">IP</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {attemptsPagination.pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">
                      No attempts yet.
                    </td>
                  </tr>
                ) : (
                  attemptsPagination.pageRows.map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-ink-muted">
                        {fmt(a.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${outcomeStyle(a.outcome)}`}>
                          {a.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">{a.ip ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{a.action ?? '—'}</td>
                      <td className="px-3 py-2 text-ink-muted">{a.reason ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={attemptsPagination.currentPage}
            pageCount={attemptsPagination.pageCount}
            totalItems={attempts.length}
            onPageChange={attemptsPagination.setPage}
          />
          </>
        )}
      </section>
    </div>
  );
}
