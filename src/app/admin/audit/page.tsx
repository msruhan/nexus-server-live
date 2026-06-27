import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import {
  AUDIT_ACTIONS,
  buildAuditWhere,
  formatAuditSummary,
  parseAuditMetadata,
} from '@/lib/admin-audit-query';

export const dynamic = 'force-dynamic';

function buildAuditHref(params: Record<string, string | undefined>, page?: number) {
  const q: Record<string, string | undefined> = { ...params };
  Object.keys(q).forEach((k) => {
    if (!q[k]) delete q[k];
  });
  return buildTablePageHref('/admin/audit', q, page ?? 1);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityId?: string;
    targetUserId?: string;
    actorUserId?: string;
  }>;
}) {
  const params = await searchParams;
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);
  const where = buildAuditWhere({
    action: params.action,
    entityId: params.entityId,
    targetUserId: params.targetUserId,
    actorUserId: params.actorUserId,
  });

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

  const filterParams = {
    action: params.action,
    entityId: params.entityId,
    targetUserId: params.targetUserId,
    actorUserId: params.actorUserId,
  };

  return (
    <div>
      <PageHeader
        section="§ Admin · Audit"
        title={
          <>
            Staff <span className="font-serif italic font-normal">audit trail</span>.
          </>
        }
        subtitle="Top-ups, manual credits, and service price changes — who did what, when."
        actions={
          <Link href="/admin/logs" className="text-sm font-semibold text-primary-600 hover:underline">
            Full activity log →
          </Link>
        }
      />

      <form method="get" className="mb-6 grid gap-3 rounded-2xl border border-line bg-paper-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Action</label>
          <select name="action" defaultValue={params.action ?? ''} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">All audit actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Entity ID</label>
          <input name="entityId" defaultValue={params.entityId ?? ''} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" placeholder="Order / service / request id" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Target user ID</label>
          <input name="targetUserId" defaultValue={params.targetUserId ?? ''} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Staff user ID</label>
          <input name="actorUserId" defaultValue={params.actorUserId ?? ''} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper">
            Filter
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-ink text-paper">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-paper/10 text-left uppercase tracking-[0.18em] text-paper/50">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const meta = parseAuditMetadata(l.metadata);
              return (
                <tr key={l.id} className="border-b border-paper/5 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-paper/70">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-2.5">{l.user?.email ?? 'system'}</td>
                  <td className="px-4 py-2.5 text-primary-300">{l.action}</td>
                  <td className="px-4 py-2.5 text-paper/80">
                    {formatAuditSummary(l.action, meta)}
                    {l.entityId && (
                      <span className="ml-2 text-paper/40">· {l.entity}{l.entityId.slice(0, 8)}…</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ServerTablePagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        buildHref={(p) => buildAuditHref(filterParams, p)}
      />
    </div>
  );
}
