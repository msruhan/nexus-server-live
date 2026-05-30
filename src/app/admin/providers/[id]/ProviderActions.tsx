'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pulse, ArrowsClockwise, Wallet, X } from '@phosphor-icons/react/dist/ssr';

type SyncedBase = {
  toolId: string;
  title: string;
  groupName: string;
  price: number;
  deliveryTime?: string;
  alreadyImported?: boolean;
};

type SyncedImei = SyncedBase & {
  requiresNetwork?: boolean;
  requiresModel?: boolean;
  requiresProvider?: boolean;
};

type SyncedServer = SyncedBase & {
  requiredFields?: string;
};

type Kind = 'imei' | 'server';

export function ProviderActions({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState<Kind | null>(null);
  const [imeiServices, setImeiServices] = React.useState<SyncedImei[]>([]);
  const [serverServices, setServerServices] = React.useState<SyncedServer[]>([]);

  async function testAccount() {
    setLoading('account');
    const res = await fetch(`/api/admin/imei/apis/${providerId}/account`);
    setLoading(null);
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      toast.error('Connection failed', { description: j.error ?? 'Unknown error' });
      return;
    }
    toast.success('Connection OK', {
      description: j.data?.hint ?? `Credit: ${j.data?.credit ?? '—'}`,
    });
    router.refresh();
  }

  async function syncOnly(kind: Kind) {
    setLoading(kind);
    const syncPath =
      kind === 'imei'
        ? `/api/admin/imei/apis/${providerId}/sync`
        : `/api/admin/imei/apis/${providerId}/sync-server`;

    const res = await fetch(syncPath, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setLoading(null);

    if (!res.ok || !json.success) {
      toast.error('Sync failed', { description: json.error ?? 'Unknown error' });
      return;
    }

    const services: SyncedBase[] = (json.data?.services ?? []).filter(
      (s: { alreadyImported?: boolean }) => !s.alreadyImported,
    );

    if (services.length === 0) {
      toast.info('Nothing to import', {
        description: `All ${kind} services already in catalog`,
      });
      router.refresh();
      return;
    }

    if (kind === 'imei') {
      setImeiServices(services as SyncedImei[]);
    } else {
      setServerServices(services as SyncedServer[]);
    }
    setDialogOpen(kind);
  }

  async function importSelected(kind: Kind, selectedIds: string[]) {
    if (selectedIds.length === 0) {
      toast.error('No services selected', { description: 'Select at least one service to import.' });
      return;
    }

    setLoading(kind);

    const base =
      kind === 'imei' ? imeiServices.filter((s) => selectedIds.includes(s.toolId)) : serverServices.filter((s) => selectedIds.includes(s.toolId));

    const services = base.map((s) => ({
      ...s,
      price: Math.max(1, Math.round(Number(s.price) * 16500)),
    }));

    const importPath =
      kind === 'imei'
        ? `/api/admin/imei/apis/${providerId}/import`
        : `/api/admin/imei/apis/${providerId}/import-server`;

    const res = await fetch(importPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(null);

    if (!res.ok || !json.success) {
      toast.error('Import failed', { description: json.error ?? 'Unknown error' });
      return;
    }

    toast.success(`${kind.toUpperCase()} catalog updated`, {
      description: json.data?.message ?? `${json.data?.imported ?? services.length} imported`,
    });
    setDialogOpen(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={<Pulse weight="bold" size={18} />}
          title="Test connection"
          desc="GET accountinfo"
          onClick={testAccount}
          loading={loading === 'account'}
        />
        <ActionCard
          icon={<ArrowsClockwise weight="bold" size={18} />}
          title="Sync IMEI services"
          desc="preview → select → import"
          onClick={() => syncOnly('imei')}
          loading={loading === 'imei'}
        />
        <ActionCard
          icon={<Wallet weight="bold" size={18} />}
          title="Sync server services"
          desc="preview → select → import"
          onClick={() => syncOnly('server')}
          loading={loading === 'server'}
        />
      </div>

      {dialogOpen === 'imei' && (
        <SyncServicesDialog
          kind="imei"
          loading={loading === 'imei'}
          services={imeiServices}
          onClose={() => setDialogOpen(null)}
          onConfirm={(ids) => importSelected('imei', ids)}
        />
      )}

      {dialogOpen === 'server' && (
        <SyncServicesDialog
          kind="server"
          loading={loading === 'server'}
          services={serverServices}
          onClose={() => setDialogOpen(null)}
          onConfirm={(ids) => importSelected('server', ids)}
        />
      )}
    </>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group rounded-xl border border-line bg-paper-50 p-4 text-left transition-all hover:border-ink hover:shadow-card-hover disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-paper">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-ink">
            {loading ? 'Working…' : title}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function SyncServicesDialog({
  kind,
  services,
  loading,
  onClose,
  onConfirm,
}: {
  kind: Kind;
  services: SyncedImei[] | SyncedServer[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(services.map((s) => s.toolId)),
  );
  const pageSize = 20;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.groupName.toLowerCase().includes(q) ||
        s.toolId.toLowerCase().includes(q)
      );
    });
  }, [services, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const allIds = filtered.map((s) => s.toolId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              {kind === 'imei' ? 'Sync IMEI services' : 'Sync server services'}
            </div>
            <h2 className="font-display text-xl font-bold text-ink">
              Select services to import
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft hover:border-ink hover:text-ink"
          >
            <X weight="bold" size={14} />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            type="search"
            placeholder="Search by name, group, or ID…"
            className="w-full max-w-sm rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm focus:border-ink focus:outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="text-xs font-mono text-ink-muted">
            {selected.size} selected · {services.length} total
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-line bg-paper-50">
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-line"
                      checked={allSelected}
                      onChange={toggleAllPage}
                    />
                  </th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Group</th>
                  <th className="px-3 py-2">Tool ID</th>
                  <th className="px-3 py-2 text-right">Price (supplier)</th>
                  {kind === 'server' && <th className="px-3 py-2">Required fields</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.toolId} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-line"
                        checked={selected.has(s.toolId)}
                        onChange={() => toggleOne(s.toolId)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{s.title}</div>
                      <div className="font-mono text-[10px] text-ink-muted">
                        {kind === 'imei'
                          ? [
                              (s as SyncedImei).requiresNetwork && 'network',
                              (s as SyncedImei).requiresModel && 'model',
                              (s as SyncedImei).requiresProvider && 'provider',
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'
                          : s.deliveryTime || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted">{s.groupName}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">{s.toolId}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {Number(s.price).toFixed(2)}
                    </td>
                    {kind === 'server' && (
                      <td className="px-3 py-2 max-w-xs truncate text-xs text-ink-muted">
                        {(s as SyncedServer).requiredFields?.slice(0, 80) ?? '—'}
                      </td>
                    )}
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={kind === 'server' ? 6 : 5}
                      className="px-3 py-8 text-center text-xs text-ink-muted"
                    >
                      No services match the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-line px-2 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-full border border-line px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-60"
            >
              {loading ? 'Mengimport…' : 'Import selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
