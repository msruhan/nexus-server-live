'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash, Eye, EyeSlash, PencilSimple, ArrowSquareOut } from '@phosphor-icons/react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Tool = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string | null;
  platform: string | null;
  downloadUrl: string;
  isPublished: boolean;
  sortOrder: number;
};

const PLATFORMS = ['Windows', 'macOS', 'Linux', 'Android', 'Multi'];

export function DownloadToolsManager({ initial }: { initial: Tool[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Tool | 'new' | null>(null);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => setItems(initial), [initial]);

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const filtered = React.useMemo(() => {
    let list = filter === 'all' ? items : items.filter((i) => i.category === filter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [t.title, t.description, t.category, t.platform, t.version, t.downloadUrl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [items, filter, search]);

  async function togglePublish(item: Tool) {
    const res = await fetch(`/api/admin/download-tools/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Update failed', { description: json.error });
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isPublished: !i.isPublished } : i)),
    );
    toast.success(item.isPublished ? 'Unpublished' : 'Published');
    router.refresh();
  }

  async function remove(item: Tool) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const res = await fetch(`/api/admin/download-tools/${item.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Delete failed', { description: json.error });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success('Tool deleted');
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <input
          type="search"
          placeholder="Search tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> Add tool
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            filter === 'all' ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
          }`}
        >
          All ({items.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === c ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
            }`}
          >
            {c} ({items.filter((i) => i.category === c).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No download tools yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border bg-paper-50 p-5 ${
                t.isPublished ? 'border-line' : 'border-line opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-ink/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                      {t.category}
                    </span>
                    {t.platform && (
                      <span className="rounded bg-paper-200 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                        {t.platform}
                      </span>
                    )}
                    {t.version && (
                      <span className="font-mono text-[10px] text-ink-muted">v{t.version}</span>
                    )}
                    {!t.isPublished && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold tracking-tight text-ink">{t.title}</h3>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{t.description}</p>
                  )}
                  <a
                    href={t.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    {t.downloadUrl} <ArrowSquareOut size={12} />
                  </a>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePublish(t)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
                    title={t.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {t.isPublished ? <Eye size={14} /> : <EyeSlash size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                  >
                    <PencilSimple size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(t)}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:border-red-300"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ToolEditorDialog
          tool={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            if (editing === 'new') {
              setItems((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));
            } else {
              setItems((prev) => prev.map((i) => (i.id === row.id ? row : i)));
            }
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ToolEditorDialog({
  tool,
  onClose,
  onSaved,
}: {
  tool: Tool | null;
  onClose: () => void;
  onSaved: (tool: Tool) => void;
}) {
  const [title, setTitle] = React.useState(tool?.title ?? '');
  const [description, setDescription] = React.useState(tool?.description ?? '');
  const [category, setCategory] = React.useState(tool?.category ?? 'general');
  const [version, setVersion] = React.useState(tool?.version ?? '');
  const [platform, setPlatform] = React.useState(tool?.platform ?? '');
  const [downloadUrl, setDownloadUrl] = React.useState(tool?.downloadUrl ?? '');
  const [isPublished, setIsPublished] = React.useState(tool?.isPublished ?? false);
  const [sortOrder, setSortOrder] = React.useState(String(tool?.sortOrder ?? 0));
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || 'general',
      version: version.trim() || null,
      platform: platform.trim() || null,
      downloadUrl: downloadUrl.trim(),
      isPublished,
      sortOrder: Number(sortOrder) || 0,
    };
    const res = await fetch(
      tool ? `/api/admin/download-tools/${tool.id}` : '/api/admin/download-tools',
      {
        method: tool ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Save failed', { description: json.error });
      return;
    }
    const row = json.data;
    onSaved({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      version: row.version,
      platform: row.platform,
      downloadUrl: row.downloadUrl,
      isPublished: row.isPublished,
      sortOrder: row.sortOrder,
    });
    toast.success(tool ? 'Tool updated' : 'Tool created');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl"
      >
        <h3 className="font-display text-lg font-extrabold">
          {tool ? 'Edit download tool' : 'New download tool'}
        </h3>
        <div className="mt-4 space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="drivers, unlock, flasher…"
            />
            <Input label="Version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Platform
            </span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Download URL"
            type="url"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://…"
            required
          />
          <Input
            label="Sort order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Published (visible to users)
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-xs font-bold">
            Cancel
          </button>
          <Button type="submit" disabled={busy || title.trim().length < 2 || !downloadUrl.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
