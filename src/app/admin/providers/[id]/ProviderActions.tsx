'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pulse, ArrowsClockwise, Wallet, X } from '@phosphor-icons/react/dist/ssr';
import {
  dhruSupplierErrorTitle,
  formatDhruSupplierUserMessage,
} from '@/lib/dhru-supplier-messages';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { useConfirm } from '@/components/ui/ConfirmProvider';

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
      const raw = j.error ?? 'Unknown error';
      toast.error(dhruSupplierErrorTitle(raw), {
        description: formatDhruSupplierUserMessage(raw),
      });
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
      const raw = json.error ?? 'Unknown error';
      toast.error(dhruSupplierErrorTitle(raw), {
        description: formatDhruSupplierUserMessage(raw),
      });
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

  async function importSelected(
    kind: Kind,
    selectedItems: Array<{ toolId: string; price: number }>,
  ) {
    if (selectedItems.length === 0) {
      toast.error('No services selected', { description: 'Select at least one service to import.' });
      return;
    }

    setLoading(kind);

    const catalog = kind === 'imei' ? imeiServices : serverServices;
    const byToolId = new Map(catalog.map((s) => [s.toolId, s]));

    const services = selectedItems
      .map(({ toolId, price: retailPrice }) => {
        const s = byToolId.get(toolId);
        if (!s) return null;
        return {
          ...s,
          supplierPrice: roundPrice(Number(s.price)),
          price: roundPrice(retailPrice),
        };
      })
      .filter((s): s is (SyncedImei | SyncedServer) & { supplierPrice: number } => s !== null);

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
          onConfirm={(items) => importSelected('imei', items)}
        />
      )}

      {dialogOpen === 'server' && (
        <SyncServicesDialog
          kind="server"
          loading={loading === 'server'}
          services={serverServices}
          onClose={() => setDialogOpen(null)}
          onConfirm={(items) => importSelected('server', items)}
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

type MarkupMode = 'percent' | 'fixed';

function roundPrice(value: number) {
  return Math.max(0, Math.round(Number(value) * 100) / 100);
}

function applyMarkup(supplierPrice: number, mode: MarkupMode, amount: number) {
  const base = Number(supplierPrice);
  if (mode === 'percent') {
    return roundPrice(base * (1 + amount / 100));
  }
  return roundPrice(base + amount);
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
  onConfirm: (items: Array<{ toolId: string; price: number }>) => void;
}) {
  const confirmDialog = useConfirm();
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [retailPrices, setRetailPrices] = React.useState<Map<string, number>>(() => new Map());
  const [markupMode, setMarkupMode] = React.useState<MarkupMode>('percent');
  const [markupValue, setMarkupValue] = React.useState('');
  const pageSize = 20;

  const supplierById = React.useMemo(
    () => new Map(services.map((s) => [s.toolId, Number(s.price)])),
    [services],
  );

  function getRetailPrice(toolId: string) {
    const override = retailPrices.get(toolId);
    if (override !== undefined) return override;
    return roundPrice(supplierById.get(toolId) ?? 0);
  }

  function setRetailPrice(toolId: string, price: number) {
    setRetailPrices((prev) => {
      const next = new Map(prev);
      next.set(toolId, roundPrice(price));
      return next;
    });
  }

  function applyBulkMarkup(toolIds: string[]) {
    const amount = Number(markupValue);
    if (!Number.isFinite(amount)) {
      toast.error('Invalid markup', { description: 'Enter a valid number for the markup.' });
      return;
    }
    if (toolIds.length === 0) {
      toast.error('No services targeted', { description: 'Select services or use apply to all.' });
      return;
    }

    setRetailPrices((prev) => {
      const next = new Map(prev);
      for (const toolId of toolIds) {
        const supplier = supplierById.get(toolId);
        if (supplier === undefined) continue;
        next.set(toolId, applyMarkup(supplier, markupMode, amount));
      }
      return next;
    });

    const modeLabel = markupMode === 'percent' ? `${amount}%` : `$${amount}`;
    toast.success('Retail prices updated', {
      description: `Applied ${modeLabel} markup to ${toolIds.length} service(s).`,
    });
  }

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

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(
    filtered,
    [search],
    pageSize,
  );

  const allIds = filtered.map((s) => s.toolId);
  const allFilteredSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someFilteredSelected = allIds.some((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleConfirm() {
    const items = Array.from(selected).map((toolId) => ({
      toolId,
      price: getRetailPrice(toolId),
    }));
    if (items.length === 0) {
      toast.error('No services selected', { description: 'Check at least one service to import.' });
      return;
    }

    const kindLabel = kind === 'imei' ? 'IMEI' : 'server';
    const ok = await confirmDialog({
      title: `Import ${kindLabel} services`,
      description: `Import ${items.length} selected ${kindLabel} service(s) into your catalog?\n\nOnly checked items will be added with the retail prices shown in the table.`,
      confirmLabel: 'Import',
      tone: 'default',
    });
    if (!ok) return;

    onConfirm(items);
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

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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

        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-paper-50 px-3 py-3">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Bulk retail markup
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
                <button
                  type="button"
                  onClick={() => setMarkupMode('percent')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    markupMode === 'percent'
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setMarkupMode('fixed')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    markupMode === 'fixed'
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  $
                </button>
              </div>
              <input
                type="number"
                step={markupMode === 'percent' ? '1' : '0.01'}
                placeholder={markupMode === 'percent' ? 'e.g. 20' : 'e.g. 1.50'}
                className="w-28 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm focus:border-ink focus:outline-none"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
              />
              <span className="text-xs text-ink-muted">
                from supplier price
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => applyBulkMarkup(Array.from(selected))}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink disabled:opacity-50"
            >
              Apply to selected
            </button>
            <button
              type="button"
              onClick={() => applyBulkMarkup(services.map((s) => s.toolId))}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink"
            >
              Apply to all
            </button>
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
                      aria-label="Select all filtered services"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                      }}
                      onChange={toggleAllFiltered}
                    />
                  </th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Group</th>
                  <th className="px-3 py-2">Tool ID</th>
                  <th className="px-3 py-2 text-right">Price (supplier)</th>
                  <th className="px-3 py-2 text-right">Retail price</th>
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
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink-muted">
                      {Number(s.price).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24 rounded-lg border border-line bg-paper px-2 py-1 text-right font-mono text-xs focus:border-ink focus:outline-none"
                        value={getRetailPrice(s.toolId)}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (Number.isFinite(next)) setRetailPrice(s.toolId, next);
                        }}
                      />
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
                      colSpan={kind === 'server' ? 7 : 6}
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
          <TablePagination
            currentPage={currentPage}
            pageCount={pageCount}
            totalItems={filtered.length}
            onPageChange={setPage}
            className="mt-0"
          />
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
              disabled={loading || selected.size === 0}
              onClick={handleConfirm}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-60"
            >
              {loading ? 'Importing…' : `Import selected (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
