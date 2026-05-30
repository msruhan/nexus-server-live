import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { TicketRowActions } from './TicketRowActions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  AWAITING_USER: 'bg-amber-100 text-amber-800',
  AWAITING_ADMIN: 'bg-violet-100 text-violet-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.q) {
    where.OR = [
      { ticketCode: { contains: params.q, mode: 'insensitive' } },
      { subject: { contains: params.q, mode: 'insensitive' } },
      { user: { email: { contains: params.q, mode: 'insensitive' } } },
    ];
  }

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastReplyAt: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const countsByStatus = counts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = c._count._all;
    return acc;
  }, {});

  const STATUSES = ['OPEN', 'AWAITING_ADMIN', 'AWAITING_USER', 'RESOLVED', 'CLOSED'];

  return (
    <div className="max-w-6xl">
      <PageHeader
        section="§ Admin · support"
        title={
          <>
            Support <span className="font-serif italic font-normal">tickets</span>.
          </>
        }
        subtitle="User-submitted issues. Reply, change priority, or close threads."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/tickets"
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            !params.status ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-50'
          }`}
        >
          All ({counts.reduce((a, c) => a + c._count._all, 0)})
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/tickets?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              params.status === s ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-50'
            }`}
          >
            {s} ({countsByStatus[s] ?? 0})
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Last reply</th>
              <th className="px-4 py-3">Replies</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-ink-muted">
                  No tickets match this filter.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/tickets/${t.id}`} className="hover:underline">
                      {t.ticketCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium hover:underline">
                      {t.subject}
                    </Link>
                    <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t.category}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium">{t.user?.name}</div>
                    <div className="text-ink-muted">{t.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold capitalize">{t.priority}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {t.lastReplyAt ? new Date(t.lastReplyAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{t._count.replies}</td>
                  <td className="px-4 py-3">
                    <TicketRowActions ticketId={t.id} ticketCode={t.ticketCode} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
