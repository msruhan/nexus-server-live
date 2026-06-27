'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, EyeSlash, Trash, X } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Ad = {
  id: string;
  text: string;
  linkUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  icon: string | null;
  isActive: boolean;
};

export function RunningAdManager({ initial }: { initial: Ad[] }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Ad | 'new' | null>(null);

  async function toggle(item: Ad) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)));
    await fetch(`/api/admin/cms/running-ads/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
  }

  async function remove(item: Ad) {
    const ok = await confirmDialog({
      title: 'Delete running ad',
      description: 'Delete this running ad?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/cms/running-ads/${item.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success('Deleted');
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {items.length} running ads
        </span>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> New ad
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No running ads yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-xl border bg-paper-50 p-4 ${
                a.isActive ? 'border-line' : 'border-line opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a.icon && <span>{a.icon}</span>}
                  <span className="truncate font-medium text-ink">{a.text}</span>
                </div>
                {a.linkUrl && (
                  <div className="mt-0.5 truncate font-mono text-[10px] text-ink-muted">{a.linkUrl}</div>
                )}
              </div>
              <button
                onClick={() => toggle(a)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
              >
                {a.isActive ? <Eye size={14} /> : <EyeSlash size={14} />}
              </button>
              <button
                onClick={() => setEditing(a)}
                className="rounded-md px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-paper-200"
              >
                Edit
              </button>
              <button
                onClick={() => remove(a)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RunningAdForm
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

function RunningAdForm({
  item,
  onClose,
  onSaved,
}: {
  item: Ad | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState({
    text: item?.text ?? '',
    linkUrl: item?.linkUrl ?? '',
    icon: item?.icon ?? '',
    isActive: item?.isActive ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!state.text) {
      toast.error('Text is required');
      return;
    }
    setSaving(true);
    const url = item ? `/api/admin/cms/running-ads/${item.id}` : '/api/admin/cms/running-ads';
    const res = await fetch(url, {
      method: item ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success(item ? 'Updated' : 'Created');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            {item ? 'Edit running ad' : 'New running ad'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <Input
            label="Text"
            value={state.text}
            onChange={(e) => setState((s) => ({ ...s, text: e.target.value }))}
            required
          />
          <Input
            label="Link URL (optional)"
            value={state.linkUrl}
            onChange={(e) => setState((s) => ({ ...s, linkUrl: e.target.value }))}
          />
          <Input
            label="Icon / emoji (optional)"
            value={state.icon}
            onChange={(e) => setState((s) => ({ ...s, icon: e.target.value }))}
            hint="Like 🎉 or NEW"
          />
        </div>
        <div className="flex justify-end border-t border-line bg-paper-100 px-5 py-3">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : item ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
