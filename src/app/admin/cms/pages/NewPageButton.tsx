'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, X } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function NewPageButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState({ title: '', slug: '' });
  const [saving, setSaving] = React.useState(false);

  function syncSlug(title: string) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    setState({ title, slug });
  }

  async function create() {
    if (!state.title || !state.slug) {
      toast.error('Title and slug are required');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/cms/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: state.title,
        slug: state.slug,
        content: `# ${state.title}\n\nWrite your content here.`,
      }),
    });
    setSaving(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Create failed', { description: j.error });
      return;
    }
    toast.success('Page created');
    router.push(`/admin/cms/pages/${j.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600"
      >
        <Plus weight="bold" size={12} /> New page
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper shadow-card-hover">
            <div className="flex items-center justify-between border-b border-line bg-paper-100 px-5 py-3">
              <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
                New custom page
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <Input
                label="Title"
                value={state.title}
                onChange={(e) => syncSlug(e.target.value)}
                placeholder="Tentang Kami"
                required
              />
              <Input
                label="URL slug"
                value={state.slug}
                onChange={(e) => setState((s) => ({ ...s, slug: e.target.value.replace(/[^a-z0-9-]/g, '') }))}
                placeholder="tentang-kami"
                hint={`Will be live at /${state.slug || '...'}`}
                required
              />
            </div>
            <div className="flex justify-end border-t border-line bg-paper-100 px-5 py-3">
              <Button onClick={create} disabled={saving}>
                {saving ? 'Creating…' : 'Create page'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
