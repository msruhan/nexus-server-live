'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ArrowsClockwise, MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import type { CatalogPickService } from '@/lib/catalog-services-shared';
import { serviceToCatalogRow } from '@/lib/catalog-services-shared';
import type { CatalogServiceRow } from '@/lib/cms-types';

type Props = {
  kind: 'imei' | 'server';
  existingIds: Set<string>;
  onAdd: (rows: CatalogServiceRow[]) => void;
  onClose: () => void;
};

export function CatalogServicePicker({ kind, existingIds, onAdd, onClose }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [services, setServices] = React.useState<CatalogPickService[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/cms/catalog-services');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error ?? 'Failed to load services');
        if (!cancelled) {
          setServices((json.services?.[kind] as CatalogPickService[]) ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error('Could not load services', {
            description: e instanceof Error ? e.message : 'Try again',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.groupTitle.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [services, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const picked = services.filter((s) => selected.has(s.id));
    if (picked.length === 0) {
      toast.message('Select at least one service');
      return;
    }
    const startIndex = existingIds.size;
    const rows = picked.map((s, i) => serviceToCatalogRow(s, startIndex + i));
    onAdd(rows);
    onClose();
    toast.success(`Added ${rows.length} service${rows.length === 1 ? '' : 's'}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
              Pick {kind === 'imei' ? 'unlock' : 'remote'} services
            </h3>
            <p className="mt-1 font-serif text-sm italic text-ink-muted">
              From marketplace-visible groups. Linked rows stay synced on the live site.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted hover:bg-paper-100 hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, group, description…"
              className="w-full rounded-lg border border-line bg-paper-50 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center font-serif text-sm italic text-ink-muted">Loading services…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center font-serif text-sm italic text-ink-muted">
              No active services found. Check Admin → Service groups marketplace visibility.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((s) => {
                const already = existingIds.has(s.id);
                const checked = selected.has(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                        already
                          ? 'cursor-not-allowed border-line bg-paper-50 opacity-60'
                          : checked
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-line hover:border-ink/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        disabled={already}
                        checked={checked}
                        onChange={() => toggle(s.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-sm font-bold text-ink">{s.title}</span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          {s.groupTitle}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-ink-soft">
                          <span>{s.priceLabel}</span>
                          {s.deliveryTime && <span>{s.deliveryTime}</span>}
                        </span>
                        {already && (
                          <span className="mt-1 block font-mono text-[10px] uppercase text-amber-700">
                            Already in catalog
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-paper-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper hover:bg-primary-600 disabled:opacity-40"
            >
              Add selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogSyncToolbar({
  kind,
  linkedCount,
  onBrowse,
  onRefresh,
  refreshing,
}: {
  kind: 'imei' | 'server';
  linkedCount: number;
  onBrowse: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-paper-50 p-3">
      <button
        type="button"
        onClick={onBrowse}
        className="rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
      >
        Browse marketplace services
      </button>
      {linkedCount > 0 && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink hover:bg-paper disabled:opacity-50"
        >
          <ArrowsClockwise size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh {linkedCount} linked
        </button>
      )}
      <span className="font-serif text-xs italic text-ink-muted">
        {kind === 'imei' ? 'Unlock' : 'Remote'} tab · manual rows stay editable · linked rows sync live
      </span>
    </div>
  );
}
