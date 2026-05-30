import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <PageHeader
        section="§ Admin · Logs"
        title={
          <>
            Activity <span className="font-serif italic font-normal">log</span>.
          </>
        }
        subtitle="Last 100 sensitive actions · who, when, what, against which entity."
      />

      <div className="overflow-hidden rounded-xl border border-line bg-ink text-paper">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-paper/10 bg-paper/[0.04] text-left uppercase tracking-[0.18em] text-paper/50">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-paper/5 last:border-0 hover:bg-paper/[0.03]">
                <td className="whitespace-nowrap px-4 py-2.5 text-paper/70">{formatDate(l.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-paper">
                  {l.user ? l.user.email : <span className="text-paper/40">system</span>}
                </td>
                <td className="px-4 py-2.5 text-primary-300">{l.action}</td>
                <td className="px-4 py-2.5 text-paper/60">
                  {l.entity ? `${l.entity}${l.entityId ? ` · ${l.entityId.slice(0, 10)}` : ''}` : '—'}
                </td>
                <td className="max-w-md truncate px-4 py-2.5 text-paper/50">{l.metadata ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
