'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Trash, Copy, Check, X } from '@phosphor-icons/react/dist/ssr';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  folder: string;
  altText: string | null;
  createdAt: string;
};

export function MediaLibrary({
  initial,
  folders,
}: {
  initial: MediaItem[];
  folders: string[];
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [items, setItems] = React.useState(initial);
  const [folder, setFolder] = React.useState<string>('all');
  const [uploadFolder, setUploadFolder] = React.useState('general');
  const [uploading, setUploading] = React.useState(false);
  const [previewing, setPreviewing] = React.useState<MediaItem | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => setItems(initial), [initial]);

  const filtered = folder === 'all' ? items : items.filter((i) => i.folder === folder);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', uploadFolder);
      const res = await fetch('/api/admin/cms/media/upload', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) success++;
    }
    setUploading(false);
    toast.success(`${success} of ${files.length} uploaded`);
    router.refresh();
  }

  async function remove(item: MediaItem) {
    const ok = await confirmDialog({
      title: 'Delete media',
      description: `Delete "${item.filename}"?`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/cms/media/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success('Deleted');
  }

  async function copyUrl(item: MediaItem) {
    const fullUrl = item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(item.id);
    toast.success('URL copied');
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
        className="rounded-2xl border-2 border-dashed border-line bg-paper-50 p-8 text-center transition-colors hover:border-ink"
      >
        <Upload size={28} weight="bold" className="mx-auto text-ink-soft" />
        <p className="mt-2 font-serif text-base italic text-ink-muted">
          Drag files here, or click to upload.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600">
            <Upload size={12} weight="bold" />
            {uploading ? 'Uploading…' : 'Choose files'}
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            into folder
          </span>
          <input
            type="text"
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value.replace(/[^a-z0-9_-]/gi, ''))}
            className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-xs"
          />
        </div>
      </div>

      {/* Folder filter */}
      <div className="mt-8 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        <button
          onClick={() => setFolder('all')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            folder === 'all' ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
          }`}
        >
          All ({items.length})
        </button>
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              folder === f ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
            }`}
          >
            {f} ({items.filter((i) => i.folder === f).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="mt-12 text-center font-serif italic text-ink-muted">
          No files in this folder.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-line bg-paper-50 hover:shadow-card"
            >
              <button
                onClick={() => setPreviewing(item)}
                className="block w-full"
              >
                <div className="relative aspect-square overflow-hidden bg-paper-200">
                  {item.mimeType.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt={item.altText ?? item.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase text-ink-muted">
                      {item.mimeType.split('/')[1] ?? 'file'}
                    </div>
                  )}
                </div>
                <div className="p-2 text-left">
                  <div className="truncate font-mono text-[10px] text-ink">{item.filename}</div>
                  <div className="font-mono text-[9px] text-ink-muted">
                    {(item.size / 1024).toFixed(1)} KB · {item.folder}
                  </div>
                </div>
              </button>
              <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUrl(item);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-paper hover:bg-primary-600"
                  title="Copy URL"
                >
                  {copiedId === item.id ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-paper text-ink hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash size={12} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/70" onClick={() => setPreviewing(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-paper">
            <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm font-bold">{previewing.filename}</div>
                <div className="font-mono text-[10px] text-ink-muted">
                  {previewing.mimeType} · {(previewing.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                onClick={() => setPreviewing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
            <div className="p-6">
              {previewing.mimeType.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewing.url} alt="" className="mx-auto max-h-[60vh] rounded-lg" />
              ) : (
                <a href={previewing.url} target="_blank" className="font-mono text-sm text-primary-600">
                  Open file →
                </a>
              )}
              <div className="mt-4 rounded-lg border border-line bg-paper-100 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  URL
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs">{previewing.url}</code>
                  <button
                    onClick={() => copyUrl(previewing)}
                    className="rounded-md bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
                  >
                    {copiedId === previewing.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
