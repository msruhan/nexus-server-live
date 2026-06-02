'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash, Eye, EyeSlash, X, Upload } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  clickCount: number;
  viewCount: number;
};

const POSITIONS = ['home_top', 'home_middle', 'sidebar', 'service_page', 'popup'];

function resolveBannerImageUrl(url: string) {
  return url.startsWith('/uploads/') ? `/api${url}` : url;
}

export function BannerManager({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Banner | 'new' | null>(null);

  React.useEffect(() => setItems(initial), [initial]);

  async function toggleActive(b: Banner) {
    setItems((prev) => prev.map((i) => (i.id === b.id ? { ...i, isActive: !i.isActive } : i)));
    const res = await fetch(`/api/admin/cms/banners/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    if (!res.ok) toast.error('Update failed');
  }

  async function remove(b: Banner) {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    const res = await fetch(`/api/admin/cms/banners/${b.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== b.id));
    toast.success('Banner deleted');
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {items.length} banners
        </span>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> New banner
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No banners yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <div
              key={b.id}
              className={`group overflow-hidden rounded-2xl border bg-paper-50 transition-all ${
                b.isActive ? 'border-line' : 'border-line opacity-60'
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-paper-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveBannerImageUrl(b.imageUrl)} alt={b.title} className="h-full w-full object-contain" />
                <div className="absolute left-2 top-2 flex gap-1">
                  <span className="rounded-md bg-ink/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper">
                    {b.position}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-bold tracking-tight text-ink">{b.title}</h3>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div className="flex gap-3 font-mono text-[10px] text-ink-muted">
                    <span>{b.viewCount} views</span>
                    <span>·</span>
                    <span>{b.clickCount} clicks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(b)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
                    >
                      {b.isActive ? <Eye size={12} /> : <EyeSlash size={12} />}
                    </button>
                    <button
                      onClick={() => setEditing(b)}
                      className="rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink hover:bg-paper-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(b)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BannerForm
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function BannerForm({
  item,
  onClose,
  onSaved,
}: {
  item: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState({
    title: item?.title ?? '',
    imageUrl: item?.imageUrl ?? '',
    linkUrl: item?.linkUrl ?? '',
    position: item?.position ?? 'home_top',
    isActive: item?.isActive ?? true,
    startDate: item?.startDate ? item.startDate.slice(0, 16) : '',
    endDate: item?.endDate ? item.endDate.slice(0, 16) : '',
  });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'banners');
    const res = await fetch('/api/admin/cms/media/upload', {
      method: 'POST',
      body: fd,
    });
    setUploading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Upload failed', { description: j.error });
      return;
    }
    setState((s) => ({ ...s, imageUrl: j.url }));
    toast.success('Image uploaded');
  }

  async function save() {
    if (!state.title || !state.imageUrl) {
      toast.error('Title and image are required');
      return;
    }
    setSaving(true);
    const url = item ? `/api/admin/cms/banners/${item.id}` : '/api/admin/cms/banners';
    const res = await fetch(url, {
      method: item ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state,
        startDate: state.startDate || null,
        endDate: state.endDate || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success(item ? 'Banner updated' : 'Banner created');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            {item ? 'Edit banner' : 'New banner'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <Input label="Title" value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} required />
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Image</label>
            {state.imageUrl ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveBannerImageUrl(state.imageUrl)} alt="" className="aspect-[16/9] w-full object-contain" />
              </div>
            ) : (
              <div className="mt-2 rounded-lg border-2 border-dashed border-line bg-paper-50 p-8 text-center">
                <Upload size={24} weight="bold" className="mx-auto text-ink-soft" />
                <p className="mt-2 font-serif text-sm italic text-ink-muted">No image yet.</p>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
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
                value={state.imageUrl}
                onChange={(e) => setState((s) => ({ ...s, imageUrl: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <Input label="Link URL (optional)" value={state.linkUrl} onChange={(e) => setState((s) => ({ ...s, linkUrl: e.target.value }))} />

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Position</label>
            <select
              value={state.position}
              onChange={(e) => setState((s) => ({ ...s, position: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Start (optional)"
              type="datetime-local"
              value={state.startDate}
              onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
            />
            <Input
              label="End (optional)"
              type="datetime-local"
              value={state.endDate}
              onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-line bg-paper-100 px-5 py-3">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : item ? 'Save changes' : 'Create banner'}
          </Button>
        </div>
      </div>
    </div>
  );
}
