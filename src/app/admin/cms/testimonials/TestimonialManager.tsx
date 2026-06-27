'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, EyeSlash, Trash, X, Star } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  avatar: string | null;
  rating: number;
  content: string;
  isVisible: boolean;
};

export function TestimonialManager({ initial }: { initial: Testimonial[] }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Testimonial | 'new' | null>(null);

  React.useEffect(() => setItems(initial), [initial]);

  async function toggle(item: Testimonial) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isVisible: !i.isVisible } : i)));
    await fetch(`/api/admin/cms/testimonials/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
  }

  async function remove(item: Testimonial) {
    const ok = await confirmDialog({
      title: 'Delete testimonial',
      description: `Delete testimonial from "${item.name}"?`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/cms/testimonials/${item.id}`, { method: 'DELETE' });
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
          {items.length} voices
        </span>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> New testimonial
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No testimonials yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border bg-paper-50 p-5 ${
                t.isVisible ? 'border-line' : 'border-line opacity-60'
              }`}
            >
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} weight="fill" size={12} />
                ))}
              </div>
              <p className="mt-3 font-serif text-base italic leading-relaxed text-ink">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display font-bold text-paper">
                  {t.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink">{t.name}</div>
                  {t.role && (
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {t.role}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggle(t)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
                  >
                    {t.isVisible ? <Eye size={12} /> : <EyeSlash size={12} />}
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-paper-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(t)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
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
        <TestimonialForm
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

function TestimonialForm({
  item,
  onClose,
  onSaved,
}: {
  item: Testimonial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState({
    name: item?.name ?? '',
    role: item?.role ?? '',
    rating: item?.rating ?? 5,
    content: item?.content ?? '',
    isVisible: item?.isVisible ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!state.name || !state.content) {
      toast.error('Name and content are required');
      return;
    }
    setSaving(true);
    const url = item ? `/api/admin/cms/testimonials/${item.id}` : '/api/admin/cms/testimonials';
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
      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
            {item ? 'Edit testimonial' : 'New testimonial'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <Input
            label="Name"
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <Input
            label="Role / location"
            value={state.role}
            onChange={(e) => setState((s) => ({ ...s, role: e.target.value }))}
            placeholder="Counter owner · Surabaya"
          />
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Rating
            </label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, rating: r }))}
                  className="text-amber-500"
                >
                  <Star size={20} weight={r <= state.rating ? 'fill' : 'regular'} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Content"
            value={state.content}
            onChange={(e) => setState((s) => ({ ...s, content: e.target.value }))}
            rows={5}
            required
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
