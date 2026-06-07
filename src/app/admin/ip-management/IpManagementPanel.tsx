'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { formatDate } from '@/lib/format';

type Entry = {
  id: string;
  ip: string;
  label: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  userId?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
};

type Tab = 'block' | 'whitelist';

export function IpManagementPanel({
  initialBlocked,
  initialWhitelisted,
  initialEnforced,
}: {
  initialBlocked: Entry[];
  initialWhitelisted: Entry[];
  initialEnforced: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'whitelist' ? 'whitelist' : 'block';

  const [blocked, setBlocked] = React.useState(initialBlocked);
  const [whitelisted, setWhitelisted] = React.useState(initialWhitelisted);
  const [enforced, setEnforced] = React.useState(initialEnforced);
  const [busy, setBusy] = React.useState(false);

  const [ip, setIp] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [note, setNote] = React.useState('');

  const rows = tab === 'block' ? blocked : whitelisted;
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(rows, [tab, rows.length]);

  React.useEffect(() => {
    setBlocked(initialBlocked);
    setWhitelisted(initialWhitelisted);
    setEnforced(initialEnforced);
  }, [initialBlocked, initialWhitelisted, initialEnforced]);

  async function refresh() {
    const res = await fetch('/api/admin/ip-management');
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return;
    setBlocked(json.data.blocked);
    setWhitelisted(json.data.whitelisted);
    setEnforced(json.data.apiIpWhitelistEnforced);
    router.refresh();
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const path = tab === 'block' ? '/api/admin/ip-management/block' : '/api/admin/ip-management/whitelist';
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, label, note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Could not add IP', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success(tab === 'block' ? 'IP blocked' : 'IP whitelisted');
    setIp('');
    setLabel('');
    setNote('');
    await refresh();
  }

  async function removeEntry(id: string) {
    if (!confirm('Remove this IP entry?')) return;
    setBusy(true);
    const path =
      tab === 'block'
        ? `/api/admin/ip-management/block/${id}`
        : `/api/admin/ip-management/whitelist/${id}`;
    const res = await fetch(path, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Delete failed', { description: json.error ?? 'Unknown error' });
      return;
    }
    toast.success('Entry removed');
    await refresh();
  }

  async function toggleEnforced(next: boolean) {
    setBusy(true);
    const res = await fetch('/api/admin/ip-management/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiIpWhitelistEnforced: next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Could not update policy', { description: json.error ?? 'Unknown error' });
      return;
    }
    setEnforced(next);
    toast.success(next ? 'API whitelist enforcement enabled' : 'API whitelist enforcement disabled');
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        <TabLink href="/admin/ip-management" active={tab === 'block'}>
          IP Block
        </TabLink>
        <TabLink href="/admin/ip-management?tab=whitelist" active={tab === 'whitelist'}>
          IP Whitelist
        </TabLink>
      </div>

      {tab === 'block' ? (
        <p className="mb-6 max-w-2xl font-serif italic text-ink-muted">
          Blocked IPs cannot access this website or any API endpoint. Use for abusive traffic or banned clients.
        </p>
      ) : (
        <div className="mb-6 max-w-3xl space-y-4 rounded-2xl border border-line bg-paper-50 p-5">
          <p className="font-serif italic text-ink-muted">
            Reseller websites that consume your API must have their server IP whitelisted. Administrators can add
            unlimited entries here; each reseller may also register one IP from their API keys page (shown as
            &ldquo;Reseller&rdquo; below). A valid API key alone is not enough when whitelist matching is required.
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-line"
              checked={enforced}
              disabled={busy}
              onChange={(e) => void toggleEnforced(e.target.checked)}
            />
            <span>
              <span className="font-medium text-ink">Enforce API whitelist</span>
              <span className="mt-1 block text-sm text-ink-muted">
                When enabled, only whitelisted IPs may use API keys. When disabled and the list is empty, all IPs are
                allowed (legacy mode). Once you add whitelist entries, matching is always required.
              </span>
            </span>
          </label>
        </div>
      )}

      <form onSubmit={addEntry} className="mb-8 grid gap-3 rounded-2xl border border-line bg-paper-50 p-5 sm:grid-cols-2">
        <Input
          label="IP or CIDR"
          placeholder="203.0.113.10 or 203.0.113.0/24"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          required
        />
        <Input
          label="Label (optional)"
          placeholder={tab === 'whitelist' ? 'Reseller storefront' : 'Abuse source'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Note (optional)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || ip.trim().length < 3}>
            <Plus size={14} weight="bold" />
            {tab === 'block' ? 'Add to block list' : 'Add to whitelist'}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">IP / CIDR</th>
              {tab === 'whitelist' && <th className="px-4 py-3">Owner</th>}
              <th className="px-4 py-3">Label</th>
              <th className="hidden px-4 py-3 lg:table-cell">Note</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={tab === 'whitelist' ? 6 : 5} className="px-4 py-10 text-center text-ink-muted">
                  {tab === 'block' ? 'No blocked IPs yet.' : 'No whitelisted IPs yet.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.ip}</td>
                  {tab === 'whitelist' && (
                    <td className="px-4 py-3 text-xs">
                      {row.userId ? (
                        <span>
                          <span className="font-semibold text-ink">Reseller</span>
                          <span className="mt-0.5 block text-ink-muted">
                            {row.ownerName ?? row.ownerEmail ?? row.userId}
                          </span>
                        </span>
                      ) : (
                        <span className="font-semibold text-ink">Admin</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">{row.label ?? '—'}</td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-ink-muted lg:table-cell">
                    {row.note ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {formatDate(new Date(row.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void removeEntry(row.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:text-red-800"
                    >
                      <Trash size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="border-t border-line px-4 py-3">
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            totalItems={rows.length}
            onPageChange={setPage}
            className="mt-0"
          />
        </div>
      </div>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
      }`}
    >
      {children}
    </Link>
  );
}
