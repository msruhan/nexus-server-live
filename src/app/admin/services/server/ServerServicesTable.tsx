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
  SERVER_FIELD_PRESETS,
  normalizeFieldKey,
} from '@/lib/server-fields';
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
  sourceType: 'PROVIDER_SYNCED' | 'MANUAL';
  toolId: string | null;
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
  const confirmDialog = useConfirm();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(
    () => filterCatalogRows(rows, search, groupFilter, 'B'),
    [rows, search, groupFilter],
  );

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [
    search,
    groupFilter,
  ]);

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
    const ok = await confirmDialog({
      title: 'Delete service',
      description: 'Delete this service? If orders exist, disable it instead.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
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

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-primary-600"
        >
          New Service
        </button>
      </div>

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
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                <td className="px-4 py-3 font-mono text-xs">B.{r.ref}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.title}</div>
                  <div className="font-mono text-[10px] text-ink-muted">
                    {r.group} · {r.sourceType === 'MANUAL' ? 'Manual' : r.provider}
                  </div>
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

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={filtered.length}
        onPageChange={setPage}
      />

      {editing && (
        <EditServerServiceDialog
          key={editing.id}
          row={editing}
          busy={busy === editing.id}
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editing.id, patch)}
        />
      )}

      {creating && (
        <NewServerServiceDialog
          groups={groups}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
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

type ProviderOption = { id: string; title: string; apiType: string };
type ProviderServiceOption = {
  toolId: string;
  title: string;
  description?: string | null;
  groupName: string;
  price: number;
  deliveryTime?: string;
  requiredFields?: string;
  source: 'cached' | 'live';
};

function NewServerServiceDialog({
  groups,
  onClose,
  onCreated,
}: {
  groups: CatalogGroupOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sourceType, setSourceType] = React.useState<'PROVIDER_SYNCED' | 'MANUAL'>('MANUAL');
  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [services, setServices] = React.useState<ProviderServiceOption[]>([]);
  const [apiId, setApiId] = React.useState('');
  const [toolId, setToolId] = React.useState('');
  const [boxId, setBoxId] = React.useState(groups[0]?.id ?? '');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('0');
  const [deliveryTime, setDeliveryTime] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [status, setStatus] = React.useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [fieldDefs, setFieldDefs] = React.useState<FieldRow[]>([]);
  const [newKey, setNewKey] = React.useState('');
  const [newLabel, setNewLabel] = React.useState('');
  const [newType, setNewType] = React.useState<FieldRow['type']>('text');
  const [newRequired, setNewRequired] = React.useState(true);
  const [loadingProviders, setLoadingProviders] = React.useState(true);
  const [loadingServices, setLoadingServices] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      setLoadingProviders(true);
      try {
        const res = await fetch('/api/admin/imei/server-services/create-options');
        const j = await res.json();
        if (res.ok && j.success) setProviders(j.data.providers ?? []);
        else toast.error('Failed to load provider list');
      } catch {
        toast.error('Failed to load provider list');
      } finally {
        setLoadingProviders(false);
      }
    })();
  }, []);

  async function loadProviderServices(nextApiId: string, refresh = false) {
    if (!nextApiId) {
      setServices([]);
      return;
    }
    setLoadingServices(true);
    try {
      const url = `/api/admin/imei/server-services/create-options?apiId=${encodeURIComponent(nextApiId)}${refresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const j = await res.json();
      if (res.ok && j.success) setServices(j.data.services ?? []);
      else toast.error('Failed to load provider services');
    } catch {
      toast.error('Failed to load provider services');
    } finally {
      setLoadingServices(false);
    }
  }

  function applyProviderService(nextToolId: string) {
    setToolId(nextToolId);
    const svc = services.find((s) => s.toolId === nextToolId);
    if (!svc) return;
    setTitle(svc.title);
    setDescription(svc.description ?? '');
    setPrice(String(svc.price));
    setDeliveryTime(svc.deliveryTime ?? '');
    const matchingGroup = groups.find((g) => g.title === svc.groupName);
    if (matchingGroup) setBoxId(matchingGroup.id);
    setFieldDefs(parseServerFieldDefs(svc.requiredFields ?? '').map((d) => ({ ...d })));
  }

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
      return [...prev, { key: k, label: (newLabel || k).trim(), required: newRequired, type: newType }];
    });
    setNewKey('');
    setNewLabel('');
    setNewType('text');
    setNewRequired(true);
  }

  function removeField(key: string) {
    setFieldDefs((prev) => prev.filter((f) => normalizeFieldKey(f.key) !== normalizeFieldKey(key)));
  }

  async function save() {
    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (!title.trim() || !Number.isFinite(priceNum) || priceNum < 0 || !Number.isFinite(quantityNum) || quantityNum < 1) {
      toast.error('Please complete the required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/imei/server-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          apiId: sourceType === 'PROVIDER_SYNCED' ? apiId : null,
          toolId: sourceType === 'PROVIDER_SYNCED' ? toolId : null,
          boxId,
          title: title.trim(),
          description,
          price: priceNum,
          deliveryTime: deliveryTime || null,
          quantity: quantityNum,
          status,
          fieldDefs,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        toast.error('Create failed', { description: j.error ?? 'Unknown error' });
        return;
      }
      toast.success('Service created');
      onCreated();
    } catch {
      toast.error('Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl rounded-2xl bg-paper p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between border-b border-line pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              New server service
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-muted">
              Create manual service or link to provider service
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

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <label className="rounded-xl border border-line bg-paper-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Manual service</span>
              <input type="radio" checked={sourceType === 'MANUAL'} onChange={() => setSourceType('MANUAL')} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">Orders stay local and wait for admin manual review.</p>
          </label>
          <label className="rounded-xl border border-line bg-paper-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Sync with provider</span>
              <input
                type="radio"
                checked={sourceType === 'PROVIDER_SYNCED'}
                onChange={() => setSourceType('PROVIDER_SYNCED')}
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">Store provider service ID so orders can be sent upstream.</p>
          </label>
        </div>

        {sourceType === 'PROVIDER_SYNCED' && (
          <div className="mb-5 rounded-xl border border-line bg-paper-50 p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <div className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  API provider
                </div>
                <select
                  value={apiId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setApiId(next);
                    setToolId('');
                    void loadProviderServices(next, false);
                  }}
                  disabled={loadingProviders}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
                >
                  <option value="">{loadingProviders ? 'Loading providers…' : 'Select provider'}</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  Provider service
                </div>
                <select
                  value={toolId}
                  onChange={(e) => applyProviderService(e.target.value)}
                  disabled={!apiId || loadingServices}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
                >
                  <option value="">
                    {!apiId ? 'Select provider first' : loadingServices ? 'Loading services…' : 'Select service'}
                  </option>
                  {services.map((s) => (
                    <option key={s.toolId} value={s.toolId}>
                      [{s.source}] {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadProviderServices(apiId, true)}
                  disabled={!apiId || loadingServices}
                  className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-ink disabled:opacity-60"
                >
                  Refresh from provider
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <Input label="Service name" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Description (rich text)
              </div>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Write service description…" />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div>
              <div className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Group
              </div>
              <select
                value={boxId}
                onChange={(e) => setBoxId(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Retail price" type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
            <Input label="Delivery time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
            <Input label="Quantity" type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <div>
              <div className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Status
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="rounded-xl border border-line bg-paper-50 p-4">
              <div className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Required fields (server)
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">Add presets</div>
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
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">Add custom field</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key" className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs" />
                    <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="label" className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs" />
                    <select value={newType} onChange={(e) => setNewType(e.target.value as FieldRow['type'])} className="rounded-md border border-line bg-paper-50 px-2 py-2 text-xs">
                      <option value="text">text</option>
                      <option value="email">email</option>
                      <option value="number">number</option>
                      <option value="password">password</option>
                      <option value="textarea">textarea</option>
                    </select>
                    <label className="flex items-center justify-between rounded-md border border-line bg-paper-50 px-2 py-2 text-xs">
                      Required
                      <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
                    </label>
                  </div>
                  <button type="button" onClick={addCustom} className="mt-2 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper">
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
                            <input className="w-full rounded-md border border-line bg-paper-50 px-2 py-1" value={f.label} onChange={(e) => setFieldDefs((prev) => prev.map((x) => (x.key === f.key ? { ...x, label: e.target.value } : x)))} />
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full rounded-md border border-line bg-paper-50 px-2 py-1" value={f.type} onChange={(e) => setFieldDefs((prev) => prev.map((x) => (x.key === f.key ? { ...x, type: e.target.value as FieldRow['type'] } : x)))}>
                              <option value="text">text</option>
                              <option value="email">email</option>
                              <option value="number">number</option>
                              <option value="password">password</option>
                              <option value="textarea">textarea</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input type="checkbox" checked={f.required} onChange={(e) => setFieldDefs((prev) => prev.map((x) => (x.key === f.key ? { ...x, required: e.target.checked } : x)))} />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" onClick={() => removeField(f.key)} className="font-mono text-[10px] uppercase tracking-wider text-red-700 hover:text-red-800">
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
              </div>
            </div>

            <button
              type="button"
              disabled={saving || title.trim().length < 2 || Number(price) < 0 || Number(quantity) < 1 || (sourceType === 'PROVIDER_SYNCED' && (!apiId || !toolId))}
              onClick={() => void save()}
              className="w-full rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create service'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [price, setPrice] = React.useState(String(row.price));
  const [fieldDefs, setFieldDefs] = React.useState<FieldRow[]>(
    () => parseServerFieldDefs(row.requiredFields).map((d) => ({ ...d })),
  );
  const priceNum = Number(price);
  const priceValid = Number.isFinite(priceNum) && priceNum >= 0;
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
