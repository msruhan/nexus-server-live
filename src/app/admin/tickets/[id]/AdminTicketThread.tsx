'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LinkedOrderDetailButton } from './LinkedOrderDetailButton';

type Reply = {
  id: string;
  authorRole: 'USER' | 'ADMIN' | 'SYSTEM';
  body: string;
  isSystem: boolean;
  attachments: Array<{ url: string; filename: string; mimeType: string; size: number }>;
  createdAt: string;
};

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  AWAITING_USER: 'bg-amber-100 text-amber-800',
  AWAITING_ADMIN: 'bg-violet-100 text-violet-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

export function AdminTicketThread({
  ticketId,
  ticketCode,
  status,
  priority,
  linkedOrderCode,
  linkedOrderId,
  linkedOrderType,
  userEmail,
  replies,
}: {
  ticketId: string;
  ticketCode: string;
  status: string;
  priority: string;
  linkedOrderCode: string | null;
  linkedOrderId: string | null;
  linkedOrderType: 'imei' | 'server' | null;
  userEmail: string;
  replies: Reply[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [statusVal, setStatusVal] = React.useState(status);
  const [priorityVal, setPriorityVal] = React.useState(priority);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/tickets/${ticketId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to send reply', { description: json.error });
      return;
    }
    setBody('');
    router.refresh();
  }

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to update', { description: json.error });
      return false;
    }
    return true;
  }

  async function applyChanges() {
    const data: Record<string, unknown> = {};
    if (statusVal !== status) data.status = statusVal;
    if (priorityVal !== priority) data.priority = priorityVal;
    if (Object.keys(data).length === 0) return;
    const ok = await patch(data);
    if (ok) {
      toast.success('Ticket updated');
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-line bg-paper-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Ticket</div>
          <div className="font-mono text-sm font-bold">{ticketCode}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">User</div>
          <div className="text-sm">{userEmail}</div>
        </div>
        {linkedOrderCode && linkedOrderId && linkedOrderType && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Linked order</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold">{linkedOrderCode}</span>
              <LinkedOrderDetailButton
                orderId={linkedOrderId}
                orderType={linkedOrderType}
                orderCode={linkedOrderCode}
              />
            </div>
          </div>
        )}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Status</div>
          <span
            className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
              STATUS_TONE[status] ?? STATUS_TONE.OPEN
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-paper-50 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Status
          </label>
          <select
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm"
          >
            <option value="OPEN">OPEN</option>
            <option value="AWAITING_USER">AWAITING_USER</option>
            <option value="AWAITING_ADMIN">AWAITING_ADMIN</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Priority
          </label>
          <select
            value={priorityVal}
            onChange={(e) => setPriorityVal(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm"
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void applyChanges()}
          disabled={statusVal === status && priorityVal === priority}
        >
          Apply
        </Button>
      </div>

      <div className="space-y-3">
        {replies.map((r) => {
          if (r.isSystem) {
            return (
              <div key={r.id} className="rounded-xl border border-dashed border-line bg-paper-50 px-4 py-2 text-center text-xs text-ink-muted">
                <span className="font-serif italic">{r.body}</span>{' '}
                <span className="font-mono text-[10px]">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            );
          }
          const isAdmin = r.authorRole === 'ADMIN';
          return (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 ${
                isAdmin ? 'border-blue-200 bg-blue-50/40' : 'border-line bg-paper-50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-ink-muted">
                  {isAdmin ? 'Admin' : 'User'}
                </span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.body}</p>
            </div>
          );
        })}
      </div>

      {status !== 'CLOSED' ? (
        <form onSubmit={reply} className="rounded-2xl border border-line bg-paper-50 p-4">
          <Textarea
            label="Reply as admin"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your reply…"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={submitting || !body.trim()}>
              {submitting ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-line bg-paper-50 p-4 text-sm text-ink-muted">
          Ticket is CLOSED. Change status above to re-open.
        </div>
      )}
    </div>
  );
}
