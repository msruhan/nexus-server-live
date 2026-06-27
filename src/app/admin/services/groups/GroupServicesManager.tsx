'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Star, Upload, Image as ImageIcon } from '@phosphor-icons/react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GroupCatalogTable } from './GroupCatalogTable';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type ImeiGroup = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  marketplaceVisible: boolean;
  featured: boolean;
  sortOrder: number;
  servicesCount: number;
};

type ServerBox = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  marketplaceVisible: boolean;
  featured: boolean;
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

/** Uploaded media is served via /api/uploads; older records may be raw /uploads. */
function resolveImageUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `/api${url}` : url;
}

function GroupImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const preview = resolveImageUrl(value || null);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'marketplace');
    const res = await fetch('/api/admin/cms/media/upload', { method: 'POST', body: fd });
    setUploading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Upload failed', { description: j.error });
      return;
    }
    onChange(j.url);
    toast.success('Image uploaded');
  }

  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        Marketplace photo
      </label>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon size={20} className="text-ink-soft" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-bold hover:border-ink">
            <Upload size={12} weight="bold" />
            {uploading ? 'Uploading…' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
          <Input
            placeholder="…or paste image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function FeaturedToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
      />
      <span className="inline-flex items-center gap-1">
        <Star size={13} weight={checked ? 'fill' : 'regular'} className="text-amber-500" />
        Featured in marketplace
      </span>
    </label>
  );
}

function MarketplaceVisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
      />
      <span className="inline-flex items-center gap-1">
        Show in marketplace
      </span>
    </label>
  );
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
  const confirmDialog = useConfirm();
  const [imeiGroups, setImeiGroups] = React.useState(initialImei);
  const [serverBoxes, setServerBoxes] = React.useState(initialServer);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState<'imei' | 'server' | null>(null);
  const [editingImei, setEditingImei] = React.useState<ImeiGroup | null>(null);
  const [editingServer, setEditingServer] = React.useState<ServerBox | null>(null);

  const [imeiTitle, setImeiTitle] = React.useState('');
  const [imeiDescription, setImeiDescription] = React.useState('');
  const [imeiImageUrl, setImeiImageUrl] = React.useState('');
  const [imeiMarketplaceVisible, setImeiMarketplaceVisible] = React.useState(true);
  const [imeiFeatured, setImeiFeatured] = React.useState(false);
  const [imeiSortOrder, setImeiSortOrder] = React.useState('0');

  const [serverTitle, setServerTitle] = React.useState('');
  const [serverDescription, setServerDescription] = React.useState('');
  const [serverImageUrl, setServerImageUrl] = React.useState('');
  const [serverMarketplaceVisible, setServerMarketplaceVisible] = React.useState(true);
  const [serverFeatured, setServerFeatured] = React.useState(false);
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
        imageUrl: imeiImageUrl.trim() || null,
        marketplaceVisible: imeiMarketplaceVisible,
        featured: imeiFeatured,
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
        imageUrl: json.data.imageUrl ?? null,
        marketplaceVisible: json.data.marketplaceVisible ?? true,
        featured: json.data.featured ?? false,
        sortOrder: json.data.sortOrder ?? 0,
        servicesCount: 0,
      },
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));
    setImeiTitle('');
    setImeiDescription('');
    setImeiImageUrl('');
    setImeiMarketplaceVisible(true);
    setImeiFeatured(false);
    setImeiSortOrder('0');
    toast.success('IMEI group created');
    router.refresh();
  }

  async function saveImeiGroup(group: ImeiGroup, patch: Partial<ImeiGroup>) {
    setBusy(group.id);
    const next = { ...group, ...patch };
    const res = await fetch(`/api/admin/imei/groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: next.title,
        description: next.description,
        imageUrl: next.imageUrl,
        marketplaceVisible: next.marketplaceVisible,
        featured: next.featured,
        sortOrder: next.sortOrder,
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
    const ok = await confirmDialog({
      title: 'Delete IMEI group',
      description: 'Delete this IMEI group? It must have no linked services.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
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

  async function bulkDeleteImeiGroups(ids: string[]) {
    setBulkDeleting('imei');
    const res = await fetch('/api/admin/imei/groups/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json().catch(() => ({}));
    setBulkDeleting(null);
    if (!res.ok || !json.success) {
      toast.error('Bulk delete failed', { description: json.error });
      return;
    }
    const deletedIds = (json.data?.deletedIds ?? []) as string[];
    const skipped = (json.data?.skipped ?? []) as Array<{ id: string; reason: string }>;
    setImeiGroups((g) => g.filter((x) => !deletedIds.includes(x.id)));
    if (deletedIds.length > 0) toast.success(`Deleted ${deletedIds.length} group(s)`);
    if (skipped.length > 0) {
      toast.warning(`Skipped ${skipped.length} group(s)`, {
        description: 'They still have linked services.',
      });
    }
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
        description: serverDescription.trim() || null,
        imageUrl: serverImageUrl.trim() || null,
        marketplaceVisible: serverMarketplaceVisible,
        featured: serverFeatured,
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
          description: json.data.description ?? null,
          imageUrl: json.data.imageUrl ?? null,
          marketplaceVisible: json.data.marketplaceVisible ?? true,
          featured: json.data.featured ?? false,
          sortOrder: json.data.sortOrder ?? 0,
          servicesCount: 0,
        },
      ].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    );
    setServerTitle('');
    setServerDescription('');
    setServerImageUrl('');
    setServerMarketplaceVisible(true);
    setServerFeatured(false);
    setServerSortOrder('0');
    toast.success('Server group created');
    router.refresh();
  }

  async function saveServerBox(box: ServerBox, patch: Partial<ServerBox>) {
    setBusy(box.id);
    const next = { ...box, ...patch };
    const res = await fetch(`/api/admin/imei/server-boxes/${box.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: next.title,
        description: next.description,
        imageUrl: next.imageUrl,
        marketplaceVisible: next.marketplaceVisible,
        featured: next.featured,
        sortOrder: next.sortOrder,
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
    const ok = await confirmDialog({
      title: 'Delete server group',
      description: 'Delete this server group? It must have no linked services.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
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

  async function bulkDeleteServerBoxes(ids: string[]) {
    setBulkDeleting('server');
    const res = await fetch('/api/admin/imei/server-boxes/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json().catch(() => ({}));
    setBulkDeleting(null);
    if (!res.ok || !json.success) {
      toast.error('Bulk delete failed', { description: json.error });
      return;
    }
    const deletedIds = (json.data?.deletedIds ?? []) as string[];
    const skipped = (json.data?.skipped ?? []) as Array<{ id: string; reason: string }>;
    setServerBoxes((boxes) => boxes.filter((x) => !deletedIds.includes(x.id)));
    if (deletedIds.length > 0) toast.success(`Deleted ${deletedIds.length} group(s)`);
    if (skipped.length > 0) {
      toast.warning(`Skipped ${skipped.length} group(s)`, {
        description: 'They still have linked services.',
      });
    }
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
              <div className="sm:col-span-2">
                <GroupImageField value={imeiImageUrl} onChange={setImeiImageUrl} />
              </div>
              <div className="sm:col-span-2">
                <MarketplaceVisibilityToggle
                  checked={imeiMarketplaceVisible}
                  onChange={(v) => {
                    setImeiMarketplaceVisible(v);
                    if (!v) setImeiFeatured(false);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <FeaturedToggle
                  checked={imeiFeatured}
                  onChange={setImeiFeatured}
                  disabled={!imeiMarketplaceVisible}
                />
              </div>
            </div>
            <Button type="submit" className="mt-4" disabled={busy === 'create-imei' || imeiTitle.trim().length < 2}>
              <Plus size={14} weight="bold" /> Add IMEI group
            </Button>
          </form>

          <GroupCatalogTable
            rows={imeiGroups}
            emptyMessage="No IMEI groups yet. Create one above or import from a provider."
            busy={busy}
            bulkDeleting={bulkDeleting === 'imei'}
            renderThumb={(g) => <GroupThumb url={g.imageUrl} />}
            onEdit={(g) => setEditingImei(g as ImeiGroup)}
            onDelete={deleteImeiGroup}
            onBulkDelete={bulkDeleteImeiGroups}
          />
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
              <div className="sm:col-span-2">
                <Textarea
                  label="Description (optional)"
                  placeholder="Shown on the marketplace group page"
                  value={serverDescription}
                  onChange={(e) => setServerDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <GroupImageField value={serverImageUrl} onChange={setServerImageUrl} />
              </div>
              <div className="sm:col-span-2">
                <MarketplaceVisibilityToggle
                  checked={serverMarketplaceVisible}
                  onChange={(v) => {
                    setServerMarketplaceVisible(v);
                    if (!v) setServerFeatured(false);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <FeaturedToggle
                  checked={serverFeatured}
                  onChange={setServerFeatured}
                  disabled={!serverMarketplaceVisible}
                />
              </div>
            </div>
            <Button type="submit" className="mt-4" disabled={busy === 'create-server' || serverTitle.trim().length < 2}>
              <Plus size={14} weight="bold" /> Add server group
            </Button>
          </form>

          <GroupCatalogTable
            rows={serverBoxes}
            emptyMessage="No server groups yet. Create one above or import from a provider."
            busy={busy}
            bulkDeleting={bulkDeleting === 'server'}
            renderThumb={(b) => <GroupThumb url={b.imageUrl} />}
            onEdit={(b) => setEditingServer(b as ServerBox)}
            onDelete={deleteServerBox}
            onBulkDelete={bulkDeleteServerBoxes}
          />
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

function GroupThumb({ url }: { url: string | null }) {
  const src = resolveImageUrl(url);
  return (
    <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper-100">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" />
      ) : (
        <ImageIcon size={14} className="text-ink-soft" />
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
  const [imageUrl, setImageUrl] = React.useState(group.imageUrl ?? '');
  const [marketplaceVisible, setMarketplaceVisible] = React.useState(group.marketplaceVisible);
  const [featured, setFeatured] = React.useState(group.featured);
  const [sortOrder, setSortOrder] = React.useState(String(group.sortOrder));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl">
        <h3 className="font-display text-lg font-extrabold">Edit IMEI group</h3>
        <div className="mt-4 space-y-3">
          <Input label="Group name" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <GroupImageField value={imageUrl} onChange={setImageUrl} />
          <MarketplaceVisibilityToggle
            checked={marketplaceVisible}
            onChange={(v) => {
              setMarketplaceVisible(v);
              if (!v) setFeatured(false);
            }}
          />
          <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <FeaturedToggle checked={featured} onChange={setFeatured} disabled={!marketplaceVisible} />
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
                imageUrl: imageUrl.trim() || null,
                marketplaceVisible,
                featured,
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
  const [description, setDescription] = React.useState(box.description ?? '');
  const [imageUrl, setImageUrl] = React.useState(box.imageUrl ?? '');
  const [marketplaceVisible, setMarketplaceVisible] = React.useState(box.marketplaceVisible);
  const [featured, setFeatured] = React.useState(box.featured);
  const [sortOrder, setSortOrder] = React.useState(String(box.sortOrder));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl">
        <h3 className="font-display text-lg font-extrabold">Edit server group</h3>
        <div className="mt-4 space-y-3">
          <Input label="Group name" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <GroupImageField value={imageUrl} onChange={setImageUrl} />
          <MarketplaceVisibilityToggle
            checked={marketplaceVisible}
            onChange={(v) => {
              setMarketplaceVisible(v);
              if (!v) setFeatured(false);
            }}
          />
          <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <FeaturedToggle checked={featured} onChange={setFeatured} disabled={!marketplaceVisible} />
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
                imageUrl: imageUrl.trim() || null,
                marketplaceVisible,
                featured,
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
