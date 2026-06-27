'use client';

import * as React from 'react';
import { MagnifyingGlass, PencilSimple, Star, Trash } from '@phosphor-icons/react';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export type GroupCatalogRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  marketplaceVisible: boolean;
  featured: boolean;
  sortOrder: number;
  servicesCount: number;
};

function filterGroupRows(rows: GroupCatalogRow[], search: string): GroupCatalogRow[] {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((r) => {
    const haystack = [r.title, r.description ?? ''].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function MarketplaceStatusPill({ visible }: { visible: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
        visible
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-line bg-paper-100 text-ink-soft'
      }`}
    >
      {visible ? 'Shown' : 'Hidden'}
    </span>
  );
}

export function GroupCatalogTable({
  rows,
  emptyMessage,
  busy,
  bulkDeleting,
  renderThumb,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  rows: GroupCatalogRow[];
  emptyMessage: string;
  busy: string | null;
  bulkDeleting: boolean;
  renderThumb: (row: GroupCatalogRow) => React.ReactNode;
  onEdit: (row: GroupCatalogRow) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
}) {
  const confirmDialog = useConfirm();
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());

  const filtered = React.useMemo(() => filterGroupRows(rows, search), [rows, search]);
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [search]);

  const pageIds = React.useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [search]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirmDialog({
      title: 'Delete selected groups',
      description: `Delete ${ids.length} selected group(s)? Groups with linked services will be skipped.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await onBulkDelete(ids);
    setSelectedIds(new Set());
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <label className="relative block min-w-[200px] flex-1 max-w-md">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Search
          </span>
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-[2.15rem] text-ink-muted"
          />
          <input
            type="search"
            placeholder="Group name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-50 py-2 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </label>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          {filtered.length} shown
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper-100 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {selectedIds.size} selected
          </span>
          {selectedIds.size < filtered.length && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(filtered.map((r) => r.id)))}
              className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
              disabled={bulkDeleting}
            >
              Select all {filtered.length} filtered
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={bulkDeleting}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={bulkDeleting || busy !== null}
            className="ml-auto rounded-full border border-red-200 bg-paper px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
          >
            {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={togglePageSelection}
                  disabled={pageIds.length === 0 || bulkDeleting}
                  className="h-4 w-4 rounded border-line"
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="hidden px-4 py-3 md:table-cell">Description</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Services</th>
              <th className="px-4 py-3">Marketplace</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-muted">
                  {rows.length === 0 ? emptyMessage : 'No groups match your search.'}
                </td>
              </tr>
            )}
            {pageRows.map((g) => (
              <tr
                key={g.id}
                className={`border-b border-line last:border-0 hover:bg-paper-100 ${
                  selectedIds.has(g.id) ? 'bg-paper-100/80' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${g.title}`}
                    checked={selectedIds.has(g.id)}
                    onChange={() => toggleRow(g.id)}
                    disabled={bulkDeleting}
                    className="h-4 w-4 rounded border-line"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {renderThumb(g)}
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      {g.title}
                      {g.featured && (
                        <Star size={12} weight="fill" className="text-amber-500" aria-label="Featured" />
                      )}
                    </span>
                  </div>
                </td>
                <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-ink-muted md:table-cell">
                  {g.description || '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{g.sortOrder}</td>
                <td className="px-4 py-3 font-mono text-xs">{g.servicesCount}</td>
                <td className="px-4 py-3">
                  <MarketplaceStatusPill visible={g.marketplaceVisible} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(g)}
                      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                      disabled={busy === g.id || bulkDeleting}
                    >
                      <PencilSimple size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(g.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:border-red-300"
                      disabled={busy === g.id || bulkDeleting}
                    >
                      <Trash size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={filtered.length}
        onPageChange={setPage}
      />
    </>
  );
}
