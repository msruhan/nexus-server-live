import Link from 'next/link';
import { ArrowUpRight, Plus } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { formatDate, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const providers = await prisma.imeiApi.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { services: true, serverServices: true } } },
  });

  return (
    <div>
      <PageHeader
        section="§ Admin · Providers"
        title={
          <>
            Upstream <span className="font-serif italic font-normal">connections</span>.
          </>
        }
        subtitle="DhruFusion provider configurations · host, credentials, balance, sync schedule."
        actions={
          <Link
            href="/admin/providers/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-primary-600"
          >
            <Plus weight="bold" size={12} /> Add provider
          </Link>
        }
      />

      {providers.length === 0 ? (
        <EmptyState
          title="No providers yet"
          description="Add your first DhruFusion connection to start syncing services."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map((p) => (
            <Link
              key={p.id}
              href={`/admin/providers/${p.id}`}
              className="group rounded-2xl border border-line bg-paper-50 p-6 transition-all hover:border-ink hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-lg font-extrabold tracking-tight text-ink">
                      {p.title}
                    </h3>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-ink-muted">{p.host}</div>
                </div>
                <ArrowUpRight
                  weight="bold"
                  size={16}
                  className="text-ink-soft transition-transform group-hover:rotate-45"
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Balance
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold text-ink">
                    —
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Services
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold text-ink">
                    {p._count.services + p._count.serverServices}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Last sync
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-ink">
                    {relativeTime(p.updatedAt)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
