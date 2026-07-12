'use client';

import * as React from 'react';
import { Eye, X } from '@phosphor-icons/react/dist/ssr';
import { formatUSD } from '@/lib/format';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';

type PriceRow = {
  kind: 'imei' | 'server';
  serviceId: string;
  title: string;
  ref: string | null;
  catalogTitle: string;
  retailPrice: number;
  userPrice: number;
  source: string;
  sourceLabel: string;
  groupName: string | null;
  adjusted: boolean;
};

type PricingPayload = {
  user: { id: string; name: string; email: string; groupName: string };
  adjustedCount: number;
  rows: PriceRow[];
};

export function UserPricingPreview({
  userId,
  userName,
  userEmail,
  groupName,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  groupName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PricingPayload | null>(null);
  const [kind, setKind] = React.useState<'all' | 'imei' | 'server'>('all');
  const [search, setSearch] = React.useState('');
  const [adjustedOnly, setAdjustedOnly] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/pricing`);
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json.success) {
      setError(json.error ?? 'Failed to load pricing');
      return;
    }
    setData(json.data as PricingPayload);
  }

  function openModal() {
    setOpen(true);
    setKind('all');
    setSearch('');
    setAdjustedOnly(false);
    void load();
  }

  const filtered = React.useMemo(() => {
    if (!data) return [];
    let list = data.rows;
    if (kind !== 'all') list = list.filter((r) => r.kind === kind);
    if (adjustedOnly) list = list.filter((r) => r.adjusted);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const hay = [r.title, r.ref ?? '', r.catalogTitle, r.sourceLabel].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [data, kind, search, adjustedOnly]);

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [
    kind,
    search,
    adjustedOnly,
    data?.rows.length,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-ink hover:text-ink"
        title="View service prices for this user"
      >
        <Eye size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-line bg-paper shadow-card-hover">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3 className="font-display text-lg font-extrabold text-ink">User pricing</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {userName} · <span className="font-mono text-xs">{userEmail}</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Group: <span className="font-semibold text-ink">{data?.user.groupName ?? groupName}</span>
                  {data && (
                    <>
                      {' '}
                      · {data.rows.length} services · {data.adjustedCount} adjusted
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line p-2 text-ink-muted hover:border-ink hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              {(['all', 'imei', 'server'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    kind === k ? 'bg-ink text-paper' : 'border border-line text-ink/80'
                  }`}
                >
                  {k === 'all' ? 'All' : k === 'imei' ? 'IMEI' : 'Server'}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={adjustedOnly}
                  onChange={(e) => setAdjustedOnly(e.target.checked)}
                />
                Adjusted only
              </label>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service…"
                className="w-full rounded-lg border border-line px-3 py-1.5 text-sm sm:w-56"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {loading && (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">Loading prices…</p>
              )}
              {error && (
                <p className="px-5 py-8 text-center text-sm text-red-700">{error}</p>
              )}
              {!loading && !error && data && (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-paper-100">
                    <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Catalog</th>
                      <th className="px-4 py-2">Service</th>
                      <th className="px-4 py-2">Ref</th>
                      <th className="px-4 py-2 text-right">Retail</th>
                      <th className="px-4 py-2 text-right">User pays</th>
                      <th className="px-4 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                          No services match your filter.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r) => (
                        <tr
                          key={`${r.kind}-${r.serviceId}`}
                          className={`border-b border-line last:border-0 ${
                            r.adjusted ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="px-4 py-2 font-mono text-[10px] uppercase">
                            {r.kind === 'imei' ? 'IMEI' : 'SRV'}
                          </td>
                          <td className="px-4 py-2 text-xs text-ink-muted">{r.catalogTitle}</td>
                          <td className="px-4 py-2 font-medium">{r.title}</td>
                          <td className="px-4 py-2 font-mono text-xs text-ink-muted">
                            {r.ref ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs text-ink-muted">
                            {formatUSD(r.retailPrice)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-xs font-semibold">
                            {formatUSD(r.userPrice)}
                          </td>
                          <td className="px-4 py-2 text-xs">{r.sourceLabel}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {data && !loading && !error && (
              <div className="border-t border-line px-5 py-3">
                <TablePagination
                  currentPage={currentPage}
                  pageCount={pageCount}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
