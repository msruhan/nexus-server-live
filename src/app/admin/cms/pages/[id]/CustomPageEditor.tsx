'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FloppyDisk, Trash, Eye } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { renderMarkdown } from '@/lib/markdown';

type PageState = {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
};

export function CustomPageEditor({ initial }: { initial: PageState }) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  function patch<K extends keyof PageState>(k: K, v: PageState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/cms/pages/${state.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSaving(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Save failed', { description: j.error });
      return;
    }
    toast.success('Page saved');
    router.refresh();
  }

  async function remove() {
    if (!confirm('Delete this page permanently?')) return;
    const res = await fetch(`/api/admin/cms/pages/${state.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Delete failed');
      return;
    }
    toast.success('Page deleted');
    router.push('/admin/cms/pages');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <div className="rounded-2xl border border-line bg-paper-50 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Title"
              value={state.title}
              onChange={(e) => patch('title', e.target.value)}
            />
            <Input
              label="URL slug"
              value={state.slug}
              onChange={(e) => patch('slug', e.target.value.replace(/[^a-z0-9-]/g, ''))}
              hint={`Live at /${state.slug}`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper-50 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              Content (Markdown)
            </h2>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider hover:border-ink"
            >
              <Eye size={12} weight="bold" />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {showPreview ? (
            <div
              className="prose prose-ink min-h-[400px] max-w-none rounded-lg border border-line bg-paper px-4 py-3"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(state.content) }}
            />
          ) : (
            <Textarea
              value={state.content}
              onChange={(e) => patch('content', e.target.value)}
              rows={24}
              className="font-mono text-sm"
            />
          )}
        </div>

        <div className="rounded-2xl border border-line bg-paper-50 p-6">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            SEO
          </h2>
          <div className="space-y-5">
            <Input
              label="Meta title"
              value={state.metaTitle ?? ''}
              onChange={(e) => patch('metaTitle', e.target.value)}
            />
            <Textarea
              label="Meta description"
              value={state.metaDescription ?? ''}
              onChange={(e) => patch('metaDescription', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:col-span-4">
        <div className="sticky top-8 space-y-4">
          <div className="rounded-2xl border border-line bg-paper-50 p-5">
            <h3 className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Publish
            </h3>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-ink">
                  {state.isPublished ? 'Published' : 'Draft'}
                </div>
                <div className="font-serif text-xs italic text-ink-muted">
                  {state.isPublished
                    ? 'Visible to public at /' + state.slug
                    : 'Not visible to public'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => patch('isPublished', !state.isPublished)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  state.isPublished ? 'bg-primary-500' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
                    state.isPublished ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <Button onClick={save} disabled={saving} className="mt-5 w-full">
              <FloppyDisk size={12} weight="bold" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>

          <button
            onClick={remove}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <Trash size={12} weight="bold" /> Delete page
          </button>

          <div className="rounded-2xl border border-line bg-paper-50 p-5">
            <h3 className="border-b border-line pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Markdown reference
            </h3>
            <ul className="mt-3 space-y-1 font-mono text-xs">
              <li><code># H1</code> · <code>## H2</code></li>
              <li><code>**bold**</code> · <code>*italic*</code></li>
              <li><code>[link](url)</code></li>
              <li><code>![alt](image-url)</code></li>
              <li><code>- bullet list</code></li>
              <li><code>{'> blockquote'}</code></li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
