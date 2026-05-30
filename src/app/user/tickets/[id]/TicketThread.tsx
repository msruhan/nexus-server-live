'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle, Lock } from '@phosphor-icons/react/dist/ssr';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Reply = {
  id: string;
  authorRole: 'USER' | 'ADMIN' | 'SYSTEM';
  body: string;
  isSystem: boolean;
  attachments: Array<{ url: string; filename: string; mimeType: string; size: number }>;
  createdAt: string;
};

export function TicketThread({
  ticketId,
  ticketCode,
  status,
  linkedOrderCode,
  canReply,
  canResolve,
  replies,
}: {
  ticketId: string;
  ticketCode: string;
  status: string;
  linkedOrderCode: string | null;
  canReply: boolean;
  canResolve: boolean;
  replies: Reply[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/user/tickets/${ticketId}/replies`, {
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

  async function resolve() {
    if (!confirm('Mark this ticket as resolved?')) return;
    setResolving(true);
    const res = await fetch(`/api/user/tickets/${ticketId}/resolve`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setResolving(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to resolve', { description: json.error });
      return;
    }
    toast.success('Ticket marked as resolved');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {linkedOrderCode && (
        <div className="rounded-xl border border-line bg-paper-50 p-3 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            § Linked order
          </span>{' '}
          <a
            href={`/user/orders/${ticketCode.startsWith('SRV') ? 'server' : ''}`}
            className="font-mono font-bold text-ink"
          >
            {linkedOrderCode}
          </a>
        </div>
      )}

      <div className="space-y-3">
        {replies.map((r) => {
          if (r.isSystem) {
            return (
              <div key={r.id} className="rounded-xl border border-dashed border-line bg-paper-50 px-4 py-2 text-center text-xs text-ink-muted">
                <span className="font-serif italic">{r.body}</span>
                <span className="ml-2 font-mono text-[10px]">{new Date(r.createdAt).toLocaleString()}</span>
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
                  {isAdmin ? 'Admin' : 'You'}
                </span>
                <span className="font-mono text-[10px] text-ink-soft">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">{r.body}</p>
              {r.attachments.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {r.attachments.map((a, i) => (
                    <li key={i}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                        📎 {a.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {canReply ? (
        <form onSubmit={reply} className="rounded-2xl border border-line bg-paper-50 p-4">
          <Textarea
            label="Your reply"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message…"
          />
          <div className="mt-3 flex justify-between">
            {canResolve ? (
              <Button type="button" variant="outline" onClick={() => void resolve()} disabled={resolving}>
                <CheckCircle size={14} />
                {resolving ? 'Resolving…' : 'Mark as resolved'}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={submitting || !body.trim()}>
              {submitting ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper-50 p-4 text-sm text-ink-muted">
          <Lock size={16} /> Ticket is closed. To re-open, please create a new ticket.
        </div>
      )}
    </div>
  );
}
