'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

type Template = {
  id: string;
  event: string;
  label: string;
  description: string;
  subject: string;
  bodyText: string;
  variables: string[];
  updatedAt: string;
};

export function EmailTemplatesEditor({ initial }: { initial: Template[] }) {
  const [templates, setTemplates] = React.useState(initial);
  const [selected, setSelected] = React.useState(initial[0]?.event ?? '');
  const [saving, setSaving] = React.useState(false);

  const current = templates.find((t) => t.event === selected);

  function patch(field: 'subject' | 'bodyText', value: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.event === selected ? { ...t, [field]: value } : t)),
    );
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    const res = await fetch(`/api/admin/cms/email-templates/${encodeURIComponent(current.event)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: current.subject, bodyText: current.bodyText }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success('Template saved');
  }

  async function reset() {
    if (!current) return;
    const res = await fetch(`/api/admin/cms/email-templates/${encodeURIComponent(current.event)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      toast.error('Reset failed');
      return;
    }
    const json = await res.json().catch(() => ({}));
    const reload = await fetch('/api/admin/cms/email-templates');
    const list = await reload.json();
    if (list.ok) setTemplates(list.templates);
    toast.success('Reset to default');
    void json;
  }

  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
      <div className="space-y-1">
        {templates.map((t) => (
          <button
            key={t.event}
            type="button"
            onClick={() => setSelected(t.event)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selected === t.event ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-100'
            }`}
          >
            <div className="font-semibold">{t.label}</div>
            <div className={`font-mono text-[10px] ${selected === t.event ? 'text-paper/70' : 'text-ink-muted'}`}>
              {t.event}
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-paper-50 p-6">
        <p className="font-serif text-sm italic text-ink-muted">{current.description}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
          Variables: {current.variables.map((v) => `{{${v}}}`).join(' · ')}
        </p>
        <div className="mt-6 space-y-4">
          <Input label="Subject" value={current.subject} onChange={(e) => patch('subject', e.target.value)} />
          <Textarea
            label="Body (plain text)"
            hint="Use {{variable}} placeholders. HTML is generated automatically."
            value={current.bodyText}
            onChange={(e) => patch('bodyText', e.target.value)}
            rows={12}
          />
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
          <Button type="button" variant="outline" onClick={() => void reset()}>
            Reset default
          </Button>
        </div>
      </div>
    </div>
  );
}
