'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  CatalogTableToolbar,
  filterCatalogRows,
  type CatalogGroupOption,
} from '@/components/admin/CatalogTableToolbar';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Row = {
  id: string;
  ref: string;
  title: string;
  groupId: string;
  group: string;
  price: number;
  status: string;
  provider: string;
  delivery: string;
  description: string;
  requiresImei: boolean;
  requiresSn: boolean;
  requiresEcid: boolean;
};

export function ServicesTable({
  rows,
  groups,
}: {
  rows: Row[];
  groups: CatalogGroupOption[];
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');
  const [findText, setFindText] = React.useState('');
  const [replaceText, setReplaceText] = React.useState('');
  const [bulkReplacing, setBulkReplacing] = React.useState(false);

  const filtered = React.useMemo(
    () => filterCatalogRows(rows, search, groupFilter, 'A'),
    [rows, search, groupFilter],
  );

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [
    search,
    groupFilter,
  ]);

  const pageIds = React.useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [search, groupFilter]);

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

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch(`/api/admin/imei/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error('Update failed');
      return;
    }
    toast.success('Saved');
    router.refresh();
  }

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: 'Delete service',
      description: 'Delete this service? If orders exist, disable it instead.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(id);
    const res = await fetch(`/api/admin/imei/services/${id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !j.success) {
      toast.error('Delete failed', { description: j.error ?? 'Unknown error' });
      return;
    }
    toast.success('Service deleted');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  function countTitleMatches(ids: string[]) {
    const idSet = new Set(ids);
    const find = findText.trim();
    if (!find) return 0;
    return rows.filter((r) => idSet.has(r.id) && r.title.includes(find)).length;
  }

  async function applyTitleReplace(targetIds: string[], scopeLabel: string) {
    const find = findText.trim();
    if (!find) {
      toast.error('Enter text to find');
      return;
    }
    if (targetIds.length === 0) {
      toast.error('No services targeted');
      return;
    }

    const matchCount = countTitleMatches(targetIds);
    if (matchCount === 0) {
      toast.error('No matching titles', {
        description: `None of the ${scopeLabel} titles contain "${find}".`,
      });
      return;
    }

    const preview =
      replaceText.trim().length > 0
        ? `"${find}" → "${replaceText}"`
        : `Remove "${find}" from titles`;

    const ok = await confirmDialog({
      title: 'Replace text in titles',
      description: `Apply to ${matchCount} of ${targetIds.length} ${scopeLabel} service(s)?\n\n${preview}`,
      confirmLabel: 'Replace',
      tone: 'default',
    });
    if (!ok) return;

    setBulkReplacing(true);
    const res = await fetch('/api/admin/imei/services/bulk-replace-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: targetIds,
        find,
        replace: replaceText,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBulkReplacing(false);

    if (!res.ok || !j.success) {
      toast.error('Replace failed', { description: j.error ?? 'Unknown error' });
      return;
    }

    const updatedCount = j.data?.updatedCount ?? 0;
    const skipped = (j.data?.skipped ?? []) as Array<{ id: string; reason: string }>;
    toast.success(`Updated ${updatedCount} title(s)`);
    if (skipped.length > 0) {
      toast.info(`Skipped ${skipped.length} service(s)`, {
        description: 'Find text not present or title would become too short.',
      });
    }
    router.refresh();
  }

  async function replaceInSelected() {
    await applyTitleReplace([...selectedIds], 'selected');
  }

  async function replaceInFiltered() {
    await applyTitleReplace(
      filtered.map((r) => r.id),
      'filtered',
    );
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirmDialog({
      title: 'Delete selected services',
      description: `Delete ${ids.length} selected service(s)? Entries with existing orders will be skipped.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    setBulkDeleting(true);
    const res = await fetch('/api/admin/imei/services/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const j = await res.json().catch(() => ({}));
    setBulkDeleting(false);

    if (!res.ok || !j.success) {
      toast.error('Bulk delete failed', { description: j.error ?? 'Unknown error' });
      return;
    }

    const deletedCount = j.data?.deletedCount ?? 0;
    const skipped = (j.data?.skipped ?? []) as Array<{ id: string; reason: string }>;

    if (deletedCount > 0) {
      toast.success(`Deleted ${deletedCount} service(s)`);
    }
    if (skipped.length > 0) {
      toast.warning(`Skipped ${skipped.length} service(s)`, {
        description: 'They still have linked orders — disable instead.',
      });
    }

    clearSelection();
    router.refresh();
  }

  return (
    <>
      <CatalogTableToolbar
        search={search}
        onSearchChange={setSearch}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groups={groups}
        resultCount={filtered.length}
      />

      <div className="mb-3 rounded-xl border border-line bg-paper-50 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Find & replace in titles
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              Find
            </span>
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder='e.g. iRemoval Pro 6 Year'
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </label>
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-ink-muted">
              Replace with
            </span>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="e.g. iRemoval"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </label>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={replaceInSelected}
              disabled={bulkReplacing || bulkDeleting || !findText.trim()}
              className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60"
            >
              {bulkReplacing ? 'Replacing…' : `Replace in selected (${selectedIds.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={replaceInFiltered}
            disabled={bulkReplacing || bulkDeleting || !findText.trim() || filtered.length === 0}
            className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-primary-600 disabled:opacity-60"
          >
            {bulkReplacing ? 'Replacing…' : `Replace in all filtered (${filtered.length})`}
          </button>
        </div>
        {findText.trim() && (
          <p className="mt-2 text-xs text-ink-muted">
            {selectedIds.size > 0
              ? `${countTitleMatches([...selectedIds])} selected · ${countTitleMatches(filtered.map((r) => r.id))} filtered titles contain "${findText.trim()}".`
              : `${countTitleMatches(filtered.map((r) => r.id))} filtered title(s) contain "${findText.trim()}".`}
          </p>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper-100 px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {selectedIds.size} selected
          </span>
          {selectedIds.size < filtered.length && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
              disabled={bulkDeleting || bulkReplacing}
            >
              Select all {filtered.length} filtered
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={bulkDeleting || bulkReplacing}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={bulkDeleting || busy !== null || bulkReplacing}
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
                  disabled={pageIds.length === 0 || bulkDeleting || bulkReplacing}
                  className="h-4 w-4 rounded border-line"
                />
              </th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Title · Group</th>
              <th className="hidden px-4 py-3 lg:table-cell">Delivery</th>
              <th className="px-4 py-3 text-right">Price (IDR)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No services match your search or group filter.
                </td>
              </tr>
            )}
            {pageRows.map((r) => {
              return (
                <tr
                  key={r.id}
                  className={`border-b border-line last:border-0 hover:bg-paper-100 ${
                    selectedIds.has(r.id) ? 'bg-paper-100/80' : ''
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.title}`}
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleRow(r.id)}
                      disabled={bulkDeleting || bulkReplacing}
                      className="h-4 w-4 rounded border-line"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">A.{r.ref}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.title}</div>
                    <div className="font-mono text-[10px] text-ink-muted">{r.group}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">{r.delivery}</td>
                  <td className="px-4 py-3 text-right">
                    <PriceInlineInput
                      value={r.price}
                      onSave={(v) => update(r.id, { price: v })}
                      disabled={busy === r.id}
                    />
                  </td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() =>
                          update(r.id, {
                            status: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })
                        }
                        className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
                        disabled={busy === r.id || bulkDeleting || bulkReplacing}
                      >
                        {r.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => setEditing(r)}
                        className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
                        disabled={busy === r.id || bulkDeleting || bulkReplacing}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="font-mono text-[10px] uppercase tracking-wider text-red-700 hover:text-red-800"
                        disabled={busy === r.id || bulkDeleting || bulkReplacing}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={filtered.length}
        onPageChange={setPage}
      />

      {editing && (
        <EditImeiServiceDialog
          key={editing.id}
          row={editing}
          busy={busy === editing.id}
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editing.id, patch)}
        />
      )}
    </>
  );
}

function EditImeiServiceDialog({
  row,
  busy,
  onClose,
  onSave,
}: {
  row: Row;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = React.useState(row.title);
  const [description, setDescription] = React.useState(row.description || '');
  const [price, setPrice] = React.useState(String(row.price));
  const [requiresImei, setRequiresImei] = React.useState(Boolean(row.requiresImei));
  const [requiresSn, setRequiresSn] = React.useState(Boolean(row.requiresSn));
  const [requiresEcid, setRequiresEcid] = React.useState(Boolean(row.requiresEcid));

  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between border-b border-line pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              IMEI service editor
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-muted">
              Ref A.{row.ref} · {row.group} · {row.provider}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink hover:border-ink"
          >
            Close
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-5">
            <Input
              label="Service name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Service name shown to users"
              required
            />
            <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Description (rich text)
            </div>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Write service description…" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Input
              label="Retail price"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              hint="Catalog price debited from the customer wallet (same as table column)."
              required
            />

            <div className="rounded-xl border border-line bg-paper-50 p-4">
              <div className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Required fields
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">IMEI</span>
                  <input
                    type="checkbox"
                    checked={requiresImei}
                    onChange={(e) => setRequiresImei(e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">Serial number</span>
                  <input
                    type="checkbox"
                    checked={requiresSn}
                    onChange={(e) => setRequiresSn(e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">ECID</span>
                  <input
                    type="checkbox"
                    checked={requiresEcid}
                    onChange={(e) => setRequiresEcid(e.target.checked)}
                  />
                </label>
                <p className="mt-2 font-serif text-xs italic text-ink-muted">
                  Device identifiers: enable IMEI, Serial Number, and/or ECID as required by the supplier.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || title.trim().length < 2 || !priceValid}
              onClick={() =>
                onSave({
                  title: title.trim(),
                  description,
                  price: priceNum,
                  requiresImei,
                  requiresSn,
                  requiresEcid,
                })
              }
              className="w-full rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceInlineInput({
  value,
  onSave,
  disabled,
}: {
  value: number;
  onSave: (v: number) => void;
  disabled: boolean;
}) {
  const [v, setV] = React.useState(String(value));
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => setV(String(value)), [value]);

  function commit() {
    setEditing(false);
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n === value) {
      setV(String(value));
      return;
    }
    onSave(n);
  }

  return editing ? (
    <input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setV(String(value));
          setEditing(false);
        }
      }}
      autoFocus
      disabled={disabled}
      className="w-32 rounded-md border border-ink bg-paper px-2 py-1 text-right font-mono text-sm focus:outline-none"
    />
  ) : (
    <button
      onClick={() => setEditing(true)}
      disabled={disabled}
      className="rounded-md border border-transparent px-2 py-1 font-mono text-sm font-bold tabular-nums text-ink hover:border-line hover:bg-paper"
    >
      {formatUSD(value)}
    </button>
  );
}
