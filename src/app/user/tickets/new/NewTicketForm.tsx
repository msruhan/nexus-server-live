'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type OrderOpt = { id: string; label: string };

export function NewTicketForm({
  imeiOrders,
  serverOrders,
  defaultImeiOrderId,
  defaultServerOrderId,
}: {
  imeiOrders: OrderOpt[];
  serverOrders: OrderOpt[];
  defaultImeiOrderId: string | null;
  defaultServerOrderId: string | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [category, setCategory] = React.useState('general');
  const [priority, setPriority] = React.useState('normal');
  const [linkType, setLinkType] = React.useState<'none' | 'imei' | 'server'>(
    defaultImeiOrderId ? 'imei' : defaultServerOrderId ? 'server' : 'none',
  );
  const [imeiOrderId, setImeiOrderId] = React.useState<string>(defaultImeiOrderId ?? '');
  const [serverOrderId, setServerOrderId] = React.useState<string>(defaultServerOrderId ?? '');
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      subject: subject.trim(),
      body: body.trim(),
      category,
      priority,
    };
    if (linkType === 'imei' && imeiOrderId) payload.imeiOrderId = imeiOrderId;
    if (linkType === 'server' && serverOrderId) payload.serverOrderId = serverOrderId;
    const res = await fetch('/api/user/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to open ticket', { description: json.error });
      return;
    }
    toast.success(`Ticket opened: ${json.data.ticketCode}`);
    router.push(`/user/tickets/${json.data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <Input
        label="Subject"
        placeholder="e.g. Order rejected but balance not refunded"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        maxLength={200}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
          >
            <option value="general">General</option>
            <option value="order">Order issue</option>
            <option value="billing">Billing / wallet</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Link to order (optional)
        </label>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setLinkType('none')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              linkType === 'none' ? 'border-ink bg-ink/5' : 'border-line bg-paper-50'
            }`}
          >
            No link
          </button>
          <button
            type="button"
            onClick={() => setLinkType('imei')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              linkType === 'imei' ? 'border-ink bg-ink/5' : 'border-line bg-paper-50'
            }`}
          >
            IMEI order
          </button>
          <button
            type="button"
            onClick={() => setLinkType('server')}
            className={`rounded-lg border px-3 py-2 text-sm ${
              linkType === 'server' ? 'border-ink bg-ink/5' : 'border-line bg-paper-50'
            }`}
          >
            Server order
          </button>
        </div>
        {linkType === 'imei' && (
          <select
            value={imeiOrderId}
            onChange={(e) => setImeiOrderId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
          >
            <option value="">— pick an order —</option>
            {imeiOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {linkType === 'server' && (
          <select
            value={serverOrderId}
            onChange={(e) => setServerOrderId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm text-ink"
          >
            <option value="">— pick an order —</option>
            {serverOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <Textarea
        label="Describe the issue"
        rows={8}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={8000}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Opening…' : 'Open ticket'}
        </Button>
      </div>
    </form>
  );
}
