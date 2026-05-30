'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  parseServerFieldDefs,
  serializeServerFieldDefs,
  SERVER_FIELD_PRESETS,
  normalizeFieldKey,
} from '@/lib/server-fields';
import {
  CatalogTableToolbar,
  filterCatalogRows,
  type CatalogGroupOption,
} from '@/components/admin/CatalogTableToolbar';

type Row = {
  id: string;
  ref: string;
  title: string;
  groupId: string;
  group: string;
  price: number;
  status: string;
  delivery: string;
  description: string;
  requiredFields: string;
};

export function ServerServicesTable({
  rows,
  groups,
}: {
  rows: Row[];
  groups: CatalogGroupOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');

  const filtered = React.useMemo(
    () => filterCatalogRows(rows, search, groupFilter, 'B'),
    [rows, search, groupFilter],
  );

  async function update(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch(`/api/admin/imei/server-services/${id}`, {
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
    if (!confirm('Delete this service? If orders exist, disable it instead.')) return;
    setBusy(id);
    const res = await fetch(`/api/admin/imei/server-services/${id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !j.success) {
      toast.error('Delete failed', { description: j.error ?? 'Unknown error' });
      return;
    }
    toast.success('Service deleted');
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

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No services match your search or group filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                <td className="px-4 py-3 font-mono text-xs">B.{r.ref}</td>
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
                      disabled={busy === r.id}
                    >
                      {r.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditing(r)}
                      className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-ink"
                      disabled={busy === r.id}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="font-mono text-[10px] uppercase tracking-wider text-red-700 hover:text-red-800"
                      disabled={busy === r.id}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditServerServiceDialog
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

type FieldRow = {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'email' | 'number' | 'password' | 'textarea';
};

function EditServerServiceDialog({
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
  const [fieldDefs, setFieldDefs] = React.useState<FieldRow[]>(
    () => parseServerFieldDefs(row.requiredFields).map((d) => ({ ...d })),
  );
  const [newKey, setNewKey] = React.useState('');
  const [newLabel, setNewLabel] = React.useState('');
  const [newType, setNewType] = React.useState<FieldRow['type']>('text');
  const [newRequired, setNewRequired] = React.useState(true);

  function addPreset(key: string) {
    const preset = SERVER_FIELD_PRESETS.find((p) => normalizeFieldKey(p.key) === normalizeFieldKey(key));
    if (!preset) return;
    setFieldDefs((prev) => {
      const exists = prev.some((f) => normalizeFieldKey(f.key) === normalizeFieldKey(preset.key));
      if (exists) return prev;
      return [...prev, { ...preset }];
    });
  }

  function addCustom() {
    const k = normalizeFieldKey(newKey);
    if (!k) return;
    setFieldDefs((prev) => {
      const exists = prev.some((f) => normalizeFieldKey(f.key) === k);
      if (exists) return prev;
      return [
        ...prev,
        {
          key: k,
          label: (newLabel || k).trim(),
          required: newRequired,
          type: newType,
        },
      ];
    });
    setNewKey('');
    setNewLabel('');
    setNewType('text');
    setNewRequired(true);
  }

  function removeField(key: string) {
    setFieldDefs((prev) => prev.filter((f) => normalizeFieldKey(f.key) !== normalizeFieldKey(key)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between border-b border-line pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Server service editor
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-muted">
              Ref B.{row.ref} · {row.group}
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

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
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

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-line bg-paper-50 p-4">
              <div className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Required fields (server)
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Add presets
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVER_FIELD_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => addPreset(p.key)}
                        className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-bold text-ink hover:border-ink"
                      >
                        + {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-paper p-3">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Add custom field
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="key (e.g. imei, sn, id)"
                      className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs"
                    />
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="label (optional)"
                      className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs"
                    />
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as FieldRow['type'])}
                      className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs"
                    >
                      <option value="text">text</option>
                      <option value="email">email</option>
                      <option value="number">number</option>
                      <option value="password">password</option>
                      <option value="textarea">textarea</option>
                    </select>
                    <label className="flex items-center justify-between rounded-md border border-line bg-paper-50 px-2 py-2 text-xs">
                      Required
                      <input
                        type="checkbox"
                        checked={newRequired}
                        onChange={(e) => setNewRequired(e.target.checked)}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addCustom}
                    className="mt-2 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper"
                  >
                    Add field
                  </button>
                </div>

                <div className="max-h-64 overflow-auto rounded-lg border border-line bg-paper">
                  <table className="w-full text-xs">
                    <thead className="border-b border-line bg-paper-100 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 text-left">Key</th>
                        <th className="px-2 py-2 text-left">Label</th>
                        <th className="px-2 py-2 text-left">Type</th>
                        <th className="px-2 py-2 text-left">Req</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {fieldDefs.map((f) => (
                        <tr key={f.key} className="border-b border-line last:border-0">
                          <td className="px-2 py-2 font-mono">{f.key}</td>
                          <td className="px-2 py-2">
                            <input
                              className="w-full rounded-md border border-line bg-paper-50 px-2 py-1"
                              value={f.label}
                              onChange={(e) =>
                                setFieldDefs((prev) =>
                                  prev.map((x) => (x.key === f.key ? { ...x, label: e.target.value } : x)),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="w-full rounded-md border border-line bg-paper-50 px-2 py-1"
                              value={f.type}
                              onChange={(e) =>
                                setFieldDefs((prev) =>
                                  prev.map((x) =>
                                    x.key === f.key ? { ...x, type: e.target.value as FieldRow['type'] } : x,
                                  ),
                                )
                              }
                            >
                              <option value="text">text</option>
                              <option value="email">email</option>
                              <option value="number">number</option>
                              <option value="password">password</option>
                              <option value="textarea">textarea</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={f.required}
                              onChange={(e) =>
                                setFieldDefs((prev) =>
                                  prev.map((x) => (x.key === f.key ? { ...x, required: e.target.checked } : x)),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeField(f.key)}
                              className="font-mono text-[10px] uppercase tracking-wider text-red-700 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {fieldDefs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-4 text-center text-ink-muted">
                            No fields yet. Add from a preset or create a custom field.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="font-mono text-[10px] text-ink-muted">
                  Will be saved as JSON: {serializeServerFieldDefs(fieldDefs)}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || title.trim().length < 2}
              onClick={() =>
                onSave({
                  title: title.trim(),
                  description,
                  fieldDefs,
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
