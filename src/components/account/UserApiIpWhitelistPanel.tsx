'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ArrowClockwise, Shield, Trash } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Entry = {
  id: string;
  ip: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
};

function fmt(date: string) {
  return new Date(date).toLocaleString();
}

export function UserApiIpWhitelistPanel() {
  const confirmDialog = useConfirm();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [ip, setIp] = React.useState('');
  const [label, setLabel] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/user/api-ip-whitelist', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to load API IP whitelist', { description: json.error });
      return;
    }
    setEntry(json.data.entry ?? null);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function registerIp(e: React.FormEvent) {
    e.preventDefault();
    if (!ip.trim()) return;
    setBusy(true);
    const res = await fetch('/api/user/api-ip-whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ip.trim(), label: label.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Could not whitelist IP', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success('Server IP whitelisted');
    setIp('');
    setLabel('');
    setEntry(json.data.entry);
  }

  async function resetIp() {
    const ok = await confirmDialog({
      title: 'Reset whitelisted IP',
      description:
        'Reset your whitelisted IP? API calls from this IP will stop working until you register a new one.',
      confirmLabel: 'Reset',
      tone: 'warning',
    });
    if (!ok) {
      return;
    }
    setBusy(true);
    const res = await fetch('/api/user/api-ip-whitelist', { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Reset failed', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success('Whitelisted IP reset');
    setEntry(null);
  }

  return (
    <section className="mb-8 rounded-2xl border border-line bg-paper-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="mt-0.5 text-ink" />
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">API server IP</h3>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Register the public IP of the server that calls this API (sync, orders). You may whitelist{' '}
              <strong className="font-semibold text-ink">one IP only</strong>. To change it, reset first, then add the
              new address.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading || busy}>
          <ArrowClockwise size={14} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : entry ? (
        <div className="mt-4 rounded-xl border border-line bg-paper p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Whitelisted IP</p>
              <p className="mt-1 font-mono text-lg font-bold text-ink">{entry.ip}</p>
              {entry.label && <p className="mt-1 text-sm text-ink-muted">{entry.label}</p>}
              <p className="mt-2 text-xs text-ink-muted">Registered {fmt(entry.createdAt)}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void resetIp()} disabled={busy}>
              <Trash size={14} />
              Reset IP
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={registerIp} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Server IP or CIDR"
            placeholder="203.0.113.45"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            required
            hint="Use the outbound public IP of your storefront or automation server."
          />
          <Input
            label="Label (optional)"
            placeholder="Production storefront"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || ip.trim().length < 3}>
              Whitelist this IP
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
