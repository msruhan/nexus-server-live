'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Initial = {
  id: string;
  title: string;
  host: string;
  username: string;
  apiKey: string;
  status: string;
  notes: string;
};

export function ProviderForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const isEdit = !!initial;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get('title')),
      host: String(fd.get('host')),
      username: String(fd.get('username')),
      apiKey: String(fd.get('apiKey')),
      status: String(fd.get('status') ?? 'ACTIVE'),
      notes: String(fd.get('notes') ?? ''),
    };

    const url = isEdit ? `/api/admin/imei/apis/${initial.id}` : '/api/admin/imei/apis';
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isEdit && !payload.apiKey?.trim()
          ? { title: payload.title, host: payload.host, username: payload.username, status: payload.status, notes: payload.notes }
          : payload,
      ),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      toast.error('Save failed', { description: j.error });
      return;
    }
    toast.success(isEdit ? 'Provider updated' : 'Provider created');
    if (!isEdit) {
      router.push(`/admin/providers/${j.data?.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <Input name="title" label="Title" placeholder="DhruFusion Main" defaultValue={initial?.title} required />
      <Input name="host" label="Host" placeholder="https://supplier.dfrn.me" defaultValue={initial?.host} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="username" label="Username" defaultValue={initial?.username} required />
        <Input
          name="apiKey"
          label={isEdit ? 'API key (leave blank to keep)' : 'API access key'}
          placeholder={isEdit ? '••••••••' : 'abc123xyz789…'}
          required={!isEdit}
        />
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Status
        </label>
        <select
          name="status"
          defaultValue={initial?.status ?? 'ACTIVE'}
          className="mt-1.5 block w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>
      <Textarea name="notes" label="Notes" defaultValue={initial?.notes} rows={2} />
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create provider'}
      </Button>
    </form>
  );
}
