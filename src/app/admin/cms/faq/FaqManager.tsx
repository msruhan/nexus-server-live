'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, EyeSlash, Trash, X } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  isVisible: boolean;
};

export function FaqManager({ initial }: { initial: Faq[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<Faq | 'new' | null>(null);
  const [filter, setFilter] = React.useState('all');

  React.useEffect(() => setItems(initial), [initial]);

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  async function toggle(item: Faq) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isVisible: !i.isVisible } : i)));
    await fetch(`/api/admin/cms/faq/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !item.isVisible }),
    });
  }

  async function remove(item: Faq) {
    if (!confirm('Delete this FAQ?')) return;
    const res = await fetch(`/api/admin/cms/faq/${item.id}`, { method: 'DELETE' });
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
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
          <button
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
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === c ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {c} ({items.filter((i) => i.category === c).length})
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-paper hover:bg-primary-600"
        >
          <Plus weight="bold" size={12} /> New FAQ
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No FAQ items.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl border bg-paper-50 p-5 ${
                f.isVisible ? 'border-line' : 'border-line opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-ink/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                      {f.category}
                    </span>
                    <h3 className="font-display text-base font-bold tracking-tight text-ink">
                      {f.question}
                    </h3>
                  </div>
                  <p className="mt-2 line-clamp-2 font-serif text-sm italic text-ink-muted">
                    {f.answer}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggle(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
                  >
                    {f.isVisible ? <Eye size={14} /> : <EyeSlash size={14} />}
                  </button>
                  <button
                    onClick={() => setEditing(f)}
                    className="rounded-md px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-paper-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <FaqForm
          item={editing === 'new' ? null : editing}
          categories={categories}
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

function FaqForm({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: Faq | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState({
    category: item?.category ?? 'general',
    question: item?.question ?? '',
    answer: item?.answer ?? '',
    isVisible: item?.isVisible ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!state.question || !state.answer) {
      toast.error('Question and answer are required');
      return;
    }
    setSaving(true);
    const url = item ? `/api/admin/cms/faq/${item.id}` : '/api/admin/cms/faq';
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
            {item ? 'Edit FAQ' : 'New FAQ'}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-line">
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <Input
            label="Category"
            value={state.category}
            onChange={(e) => setState((s) => ({ ...s, category: e.target.value }))}
            list="faq-categories"
          />
          <datalist id="faq-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <Input
            label="Question"
            value={state.question}
            onChange={(e) => setState((s) => ({ ...s, question: e.target.value }))}
            required
          />
          <Textarea
            label="Answer"
            value={state.answer}
            onChange={(e) => setState((s) => ({ ...s, answer: e.target.value }))}
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
