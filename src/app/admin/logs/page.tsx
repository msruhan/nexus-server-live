import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import {
  activityLogAudienceWhere,
  LOG_AUDIENCE_TABS,
  resolveLogAudienceTab,
} from '@/lib/admin-logs-query';

export const dynamic = 'force-dynamic';

function buildLogsHref(audience: string, page?: number) {
  return buildTablePageHref(
    '/admin/logs',
    { audience: audience !== 'all' ? audience : undefined },
    page ?? 1,
  );
}

function actorLabel(user: { name: string; email: string; role: string } | null): string {
  if (!user) return 'system';
  if (user.role === 'ADMIN' || user.role === 'SUB_ADMIN') return user.email;
  return user.email;
}

function actorKind(user: { role: string } | null): 'system' | 'admin' | 'customer' {
  if (!user) return 'system';
  if (user.role === 'ADMIN' || user.role === 'SUB_ADMIN') return 'admin';
  return 'customer';
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; audience?: string }>;
}) {
  const params = await searchParams;
  const audienceTab = resolveLogAudienceTab(params.audience);
  const where = activityLogAudienceWhere(audienceTab.key);
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Admin · Logs"
        title={
          <>
            Activity <span className="font-serif italic font-normal">log</span>.
          </>
        }
        subtitle="Sensitive actions · who, when, what, against which entity."
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {LOG_AUDIENCE_TABS.map((t) => {
          const active = audienceTab.key === t.key;
          return (
            <Link
              key={t.key}
              href={buildLogsHref(t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-ink text-paper">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-paper/10 bg-paper/[0.04] text-left uppercase tracking-[0.18em] text-paper/50">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-paper/50">
                  No log entries for this filter.
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const kind = actorKind(l.user);
                return (
                  <tr key={l.id} className="border-b border-paper/5 last:border-0 hover:bg-paper/[0.03]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-paper/70">{formatDate(l.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-paper">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            kind === 'admin'
                              ? 'bg-primary-500/20 text-primary-200'
                              : kind === 'customer'
                                ? 'bg-paper/10 text-paper/60'
                                : 'bg-paper/5 text-paper/40'
                          }`}
                        >
                          {kind === 'admin' ? 'staff' : kind === 'customer' ? 'user' : 'sys'}
                        </span>
                        <span>{actorLabel(l.user)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-primary-300">{l.action}</td>
                    <td className="px-4 py-2.5 text-paper/60">
                      {l.entity ? `${l.entity}${l.entityId ? ` · ${l.entityId.slice(0, 10)}` : ''}` : '—'}
                    </td>
                    <td className="max-w-md truncate px-4 py-2.5 text-paper/50">{l.metadata ?? '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ServerTablePagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        buildHref={(p) => buildLogsHref(audienceTab.key, p)}
      />
    </div>
  );
}
