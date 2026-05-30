'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FilePdf, Lock, LockOpen, Shield, Trash } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiKeySecurityPanel } from '@/components/account/ApiKeySecurityPanel';
import {
  API_KEY_DISPLAY_MASK_LENGTH,
  ApiKeySecretDisplay,
} from '@/components/account/ApiKeySecretDisplay';

type ApiKeyRow = {
  id: string;
  name: string;
  apiUsername: string | null;
  keyPrefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  // Security summary (added in P1; may be undefined for older payloads).
  ipMode?: 'none' | 'allowlist' | 'lock_first';
  lockedIp?: string | null;
  lockedAt?: string | null;
  rateLimitPerMinute?: number | null;
  rateLimitPerHour?: number | null;
  throttleUntil?: string | null;
};

type CreatedKey = ApiKeyRow & { plainKey: string };

function formatDate(v: string | null) {
  if (!v) return 'Never';
  return new Date(v).toLocaleString();
}

export function ApiKeysManager() {
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [apiUsername, setApiUsername] = React.useState('');
  const [expiresInDays, setExpiresInDays] = React.useState('90');
  const [rows, setRows] = React.useState<ApiKeyRow[]>([]);
  const [newPlain, setNewPlain] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = React.useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/user/api-keys', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to load API keys', { description: json.error ?? 'Unknown error' });
      return;
    }
    setRows(json.data ?? []);
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        apiUsername: apiUsername.trim().toLowerCase(),
        expiresInDays: Number(expiresInDays) || 90,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to create API key', { description: json.error ?? 'Unknown error' });
      return;
    }

    const created = json.data as CreatedKey;
    setRows((prev) => [created, ...prev]);
    setName('');
    setApiUsername('');
    setExpiresInDays('90');
    setNewPlain(created.plainKey);
    toast.success('API key created — copy the secret now; it will not be shown again.');
  }

  async function downloadDocumentation() {
    setDownloadingDoc(true);
    try {
      const res = await fetch('/api/user/api-keys/documentation');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error('Download failed', { description: json.error ?? res.statusText });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ??
        'nexus-server-api-documentation.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('API documentation downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingDoc(false);
    }
  }

  async function updateKey(id: string, patch: Partial<Pick<ApiKeyRow, 'name' | 'isActive'>>) {
    const res = await fetch(`/api/user/api-keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to update API key', { description: json.error ?? 'Unknown error' });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? json.data : r)));
  }

  async function removeKey(id: string) {
    const res = await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to delete API key', { description: json.error ?? 'Unknown error' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success('API key deleted');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">API integration guide</p>
          <p className="text-xs text-ink-muted">
            PDF covers REST v1, authentication headers, orders, and Dhru-compatible endpoints.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={downloadingDoc}
          onClick={() => void downloadDocumentation()}
        >
          <FilePdf size={16} weight="duotone" />
          {downloadingDoc ? 'Generating…' : 'Download API documentation'}
        </Button>
      </div>

      <form onSubmit={createKey} className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">Create new API key</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              label="Key name"
              placeholder="Example: Website A Production"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Input
            label="API username"
            placeholder="reseller_demo"
            value={apiUsername}
            onChange={(e) => setApiUsername(e.target.value)}
            required
          />
          <Input
            label="Expires (days)"
            type="number"
            min={1}
            max={365}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />
        </div>
        <Button type="submit" className="mt-4" disabled={creating}>
          {creating ? 'Creating…' : 'Generate API key'}
        </Button>
      </form>

      {newPlain && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h4 className="font-semibold text-amber-900">Copy this key now (shown once)</h4>
          <p className="mt-1 text-xs text-amber-800">
            For security, the full API key is hidden by default and cannot be retrieved later. Only the prefix
            remains in the list below.
          </p>
          <div className="mt-3">
            <ApiKeySecretDisplay
              value={newPlain}
              copyValue={newPlain}
              maskLength={newPlain.length}
              defaultVisible={false}
              monoClassName="block w-full overflow-x-auto rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-amber-950"
            />
          </div>
          <p className="mt-3 text-xs text-amber-900">
            Required headers: <code>x-api-username</code> + <code>Authorization: Bearer &lt;key&gt;</code> (or{' '}
            <code>x-api-key</code>)
          </p>
          <button
            type="button"
            onClick={() => setNewPlain(null)}
            className="mt-3 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper-50">
        <table className="w-full min-w-[1040px] text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Key prefix</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Security</th>
              <th className="px-4 py-3">Last used</th>
              <th className="px-4 py-3">Expires</th>
              <th className="sticky right-0 z-10 whitespace-nowrap border-l border-line bg-paper-100 px-4 py-3 pr-5 text-right shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                  Loading API keys...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                  No API keys yet.
                </td>
              </tr>
            ) : (
              rows.flatMap((r) => {
                const ipBadge = (() => {
                  if (!r.ipMode || r.ipMode === 'none') {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                        <LockOpen size={10} /> open
                      </span>
                    );
                  }
                  if (r.ipMode === 'lock_first') {
                    return r.lockedIp ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <Lock size={10} /> {r.lockedIp}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        <Lock size={10} /> awaiting first use
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                      <Shield size={10} /> allowlist
                    </span>
                  );
                })();

                const rateBadge =
                  (r.rateLimitPerMinute ?? 0) > 0 || (r.rateLimitPerHour ?? 0) > 0 ? (
                    <span className="ml-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                      rate-limited
                    </span>
                  ) : null;

                const expanded = expandedId === r.id;

                return [
                  <tr key={r.id} className="group border-b border-line last:border-0 hover:bg-paper-100">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.apiUsername ?? '—'}</td>
                    <td className="min-w-[200px] max-w-[280px] px-4 py-3">
                      <ApiKeySecretDisplay
                        value={r.keyPrefix}
                        copyValue={r.keyPrefix}
                        maskLength={API_KEY_DISPLAY_MASK_LENGTH}
                        prefixOnly
                        compact
                        defaultVisible={false}
                        monoClassName="block max-w-[200px] overflow-x-auto rounded-md border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {r.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {ipBadge}
                        {rateBadge}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(r.lastUsedAt)}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(r.expiresAt)}</td>
                    <td className="sticky right-0 z-10 whitespace-nowrap border-l border-line bg-paper-50 px-4 py-3 pr-5 shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)] group-hover:bg-paper-100">
                      <div className="flex shrink-0 items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                        >
                          <Shield size={14} />
                          {expanded ? 'Close' : 'Security'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void updateKey(r.id, { isActive: !r.isActive })}
                        >
                          {r.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void removeKey(r.id)}
                          aria-label="Delete API key"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>,
                  expanded ? (
                    <tr key={`${r.id}-expanded`} className="border-b border-line bg-paper-100/50 last:border-0">
                      <td colSpan={8} className="px-4 py-4">
                        <ApiKeySecurityPanel keyId={r.id} onChanged={() => void load()} />
                      </td>
                    </tr>
                  ) : null,
                ].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
