'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type ImeiGroup = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  servicesCount: number;
};

type ServerBox = {
  id: string;
  title: string;
  sortOrder: number;
  servicesCount: number;
};

const TABS = [
  { key: 'imei' as const, label: 'IMEI services' },
  { key: 'server' as const, label: 'Server services' },
];

function buildGroupsHref(tab: 'imei' | 'server') {
  return tab === 'imei' ? '/admin/services/groups' : '/admin/services/groups?tab=server';
}

export function GroupServicesManager({
  activeTab,
  imeiGroups: initialImei,
  serverBoxes: initialServer,
}: {
  activeTab: 'imei' | 'server';
  imeiGroups: ImeiGroup[];
  serverBoxes: ServerBox[];
}) {
  const router = useRouter();
  const [imeiGroups, setImeiGroups] = React.useState(initialImei);
  const [serverBoxes, setServerBoxes] = React.useState(initialServer);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [editingImei, setEditingImei] = React.useState<ImeiGroup | null>(null);
  const [editingServer, setEditingServer] = React.useState<ServerBox | null>(null);

  const [imeiTitle, setImeiTitle] = React.useState('');
  const [imeiDescription, setImeiDescription] = React.useState('');
  const [imeiSortOrder, setImeiSortOrder] = React.useState('0');

  const [serverTitle, setServerTitle] = React.useState('');
  const [serverSortOrder, setServerSortOrder] = React.useState('0');

  React.useEffect(() => setImeiGroups(initialImei), [initialImei]);
  React.useEffect(() => setServerBoxes(initialServer), [initialServer]);

  async function createImeiGroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy('create-imei');
    const res = await fetch('/api/admin/imei/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: imeiTitle.trim(),
        description: imeiDescription.trim() || null,
        sortOrder: Number(imeiSortOrder) || 0,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to create group', { description: json.error });
      return;
    }
    setImeiGroups((g) => [
      ...g,
      {
        id: json.data.id,
        title: json.data.title,
        description: json.data.description ?? null,
        sortOrder: json.data.sortOrder ?? 0,
        servicesCount: 0,
      },
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));
    setImeiTitle('');
    setImeiDescription('');
    setImeiSortOrder('0');
    toast.success('IMEI group created');
    router.refresh();
  }

  async function saveImeiGroup(group: ImeiGroup, patch: Partial<ImeiGroup>) {
    setBusy(group.id);
    const res = await fetch(`/api/admin/imei/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: patch.title ?? group.title,
        description: patch.description !== undefined ? patch.description : group.description,
        sortOrder: patch.sortOrder ?? group.sortOrder,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to update group', { description: json.error });
      return;
    }
    setImeiGroups((groups) =>
      groups
        .map((g) => (g.id === group.id ? { ...g, ...patch } : g))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    );
    setEditingImei(null);
    toast.success('Group updated');
    router.refresh();
  }

  async function deleteImeiGroup(id: string) {
    if (!confirm('Delete this IMEI group? It must have no linked services.')) return;
    setBusy(id);
    const res = await fetch(`/api/admin/imei/groups/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to delete group', { description: json.error });
      return;
    }
    setImeiGroups((g) => g.filter((x) => x.id !== id));
    toast.success('Group deleted');
    router.refresh();
  }

  async function createServerBox(e: React.FormEvent) {
    e.preventDefault();
    setBusy('create-server');
    const res = await fetch('/api/admin/imei/server-boxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: serverTitle.trim(),
        sortOrder: Number(serverSortOrder) || 0,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to create group', { description: json.error });
      return;
    }
    setServerBoxes((boxes) =>
      [
        ...boxes,
        {
          id: json.data.id,
          title: json.data.title,
          sortOrder: json.data.sortOrder ?? 0,
          servicesCount: 0,
        },
      ].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    );
    setServerTitle('');
    setServerSortOrder('0');
    toast.success('Server group created');
    router.refresh();
  }

  async function saveServerBox(box: ServerBox, patch: Partial<ServerBox>) {
    setBusy(box.id);
    const res = await fetch(`/api/admin/imei/server-boxes/${box.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: patch.title ?? box.title,
        sortOrder: patch.sortOrder ?? box.sortOrder,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to update group', { description: json.error });
      return;
    }
    setServerBoxes((boxes) =>
      boxes
        .map((b) => (b.id === box.id ? { ...b, ...patch } : b))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    );
    setEditingServer(null);
    toast.success('Group updated');
    router.refresh();
  }

  async function deleteServerBox(id: string) {
    if (!confirm('Delete this server group? It must have no linked services.')) return;
    setBusy(id);
    const res = await fetch(`/api/admin/imei/server-boxes/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.success) {
      toast.error('Failed to delete group', { description: json.error });
      return;
    }
    setServerBoxes((boxes) => boxes.filter((x) => x.id !== id));
    toast.success('Group deleted');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={buildGroupsHref(t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {activeTab === 'imei' ? (
        <>
          <form onSubmit={createImeiGroup} className="rounded-2xl border border-line bg-paper-50 p-5">
            <h3 className="font-display text-lg font-extrabold tracking-tight">New IMEI group</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Services imported from a provider are grouped by name; you can also create groups here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="Group name"
                placeholder="Samsung Unlock, iCloud Bypass…"
                value={imeiTitle}
                onChange={(e) => setImeiTitle(e.target.value)}
                required
              />
              <Input
                label="Sort order"
                type="number"
                value={imeiSortOrder}
                onChange={(e) => setImeiSortOrder(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Description (optional)"
                  placeholder="Shown on the public catalog group page"
                  value={imeiDescription}
                  onChange={(e) => setImeiDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <Button type="submit" className="mt-4" disabled={busy === 'create-imei' || imeiTitle.trim().length < 2}>
              <Plus size={14} weight="bold" /> Add IMEI group
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="hidden px-4 py-3 md:table-cell">Description</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Services</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {imeiGroups.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                    <td className="px-4 py-3 font-medium text-ink">{g.title}</td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-ink-muted md:table-cell">
                      {g.description || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{g.sortOrder}</td>
                    <td className="px-4 py-3 font-mono text-xs">{g.servicesCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingImei(g)}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                          disabled={busy === g.id}
                        >
                          <PencilSimple size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteImeiGroup(g.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:border-red-300"
                          disabled={busy === g.id}
                        >
                          <Trash size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {imeiGroups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
                      No IMEI groups yet. Create one above or import from a provider.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <form onSubmit={createServerBox} className="rounded-2xl border border-line bg-paper-50 p-5">
            <h3 className="font-display text-lg font-extrabold tracking-tight">New server group</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Server services are grouped into boxes for the public catalog and API.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="Group name"
                placeholder="Server Demo, Remote tools…"
                value={serverTitle}
                onChange={(e) => setServerTitle(e.target.value)}
                required
              />
              <Input
                label="Sort order"
                type="number"
                value={serverSortOrder}
                onChange={(e) => setServerSortOrder(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-4" disabled={busy === 'create-server' || serverTitle.trim().length < 2}>
              <Plus size={14} weight="bold" /> Add server group
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Services</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serverBoxes.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                    <td className="px-4 py-3 font-medium text-ink">{b.title}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.sortOrder}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.servicesCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingServer(b)}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                          disabled={busy === b.id}
                        >
                          <PencilSimple size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteServerBox(b.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:border-red-300"
                          disabled={busy === b.id}
                        >
                          <Trash size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {serverBoxes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-muted">
                      No server groups yet. Create one above or import from a provider.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingImei && (
        <EditImeiGroupDialog
          group={editingImei}
          busy={busy === editingImei.id}
          onClose={() => setEditingImei(null)}
          onSave={(patch) => saveImeiGroup(editingImei, patch)}
        />
      )}

      {editingServer && (
        <EditServerBoxDialog
          box={editingServer}
          busy={busy === editingServer.id}
          onClose={() => setEditingServer(null)}
          onSave={(patch) => saveServerBox(editingServer, patch)}
        />
      )}
    </div>
  );
}

function EditImeiGroupDialog({
  group,
  busy,
  onClose,
  onSave,
}: {
  group: ImeiGroup;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ImeiGroup>) => void;
}) {
  const [title, setTitle] = React.useState(group.title);
  const [description, setDescription] = React.useState(group.description ?? '');
  const [sortOrder, setSortOrder] = React.useState(String(group.sortOrder));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-paper p-5 shadow-xl">
        <h3 className="font-display text-lg font-extrabold">Edit IMEI group</h3>
        <div className="mt-4 space-y-3">
          <Input label="Group name" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-xs font-bold">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || title.trim().length < 2}
            onClick={() =>
              onSave({
                title: title.trim(),
                description: description.trim() || null,
                sortOrder: Number(sortOrder) || 0,
              })
            }
            className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditServerBoxDialog({
  box,
  busy,
  onClose,
  onSave,
}: {
  box: ServerBox;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ServerBox>) => void;
}) {
  const [title, setTitle] = React.useState(box.title);
  const [sortOrder, setSortOrder] = React.useState(String(box.sortOrder));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-paper p-5 shadow-xl">
        <h3 className="font-display text-lg font-extrabold">Edit server group</h3>
        <div className="mt-4 space-y-3">
          <Input label="Group name" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-xs font-bold">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || title.trim().length < 2}
            onClick={() =>
              onSave({
                title: title.trim(),
                sortOrder: Number(sortOrder) || 0,
              })
            }
            className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
