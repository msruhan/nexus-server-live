import Link from 'next/link';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  AWAITING_USER: 'bg-amber-100 text-amber-800',
  AWAITING_ADMIN: 'bg-violet-100 text-violet-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

const PRIORITY_TONE: Record<string, string> = {
  low: 'text-zinc-500',
  normal: 'text-ink-muted',
  high: 'text-amber-700',
  urgent: 'text-red-700',
};

export default async function UserTicketsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/user/tickets');

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      ticketCode: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      lastReplyAt: true,
      lastReplyBy: true,
      updatedAt: true,
      _count: { select: { replies: true } },
    },
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Support"
        title={
          <>
            Your <span className="font-serif italic font-normal">tickets</span>.
          </>
        }
        subtitle="Open a thread for any issue with an order, billing, or general question."
        actions={
          <Link
            href="/user/tickets/new"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-primary-600"
          >
            <Plus size={14} weight="bold" /> New ticket
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Last reply</th>
              <th className="px-4 py-3">Replies</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  No tickets yet. Open one when you need help.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/user/tickets/${t.id}`} className="text-ink hover:underline">
                      {t.ticketCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/user/tickets/${t.id}`} className="font-medium text-ink hover:underline">
                      {t.subject}
                    </Link>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                      {t.category}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[t.status] ?? STATUS_TONE.OPEN}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold ${PRIORITY_TONE[t.priority]}`}>
                    {t.priority}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {t.lastReplyAt ? new Date(t.lastReplyAt).toLocaleString() : '—'}
                    {t.lastReplyBy && (
                      <div className="text-[10px] uppercase tracking-wide text-ink-soft">
                        by {t.lastReplyBy.toLowerCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{t._count.replies}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
