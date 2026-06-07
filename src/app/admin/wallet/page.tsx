import { prisma } from '@/lib/db';
import { TopupStatus } from '@/lib/constants';
import { formatUSD, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { StatusPill } from '@/components/ui/StatusPill';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import { TopupActions } from './TopupActions';

export const dynamic = 'force-dynamic';

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pendingPage?: string }>;
}) {
  const params = await searchParams;
  const historyPage = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);
  const pendingPage = parseTablePage(params.pendingPage, DEFAULT_TABLE_PAGE_SIZE);

  const [pending, pendingTotal, history, historyTotal, totalUsers, totalBalance] = await Promise.all([
    prisma.topupRequest.findMany({
      where: { status: TopupStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      skip: pendingPage.skip,
      take: pendingPage.pageSize,
      include: { user: true },
    }),
    prisma.topupRequest.count({ where: { status: TopupStatus.PENDING } }),
    prisma.topupRequest.findMany({
      where: { status: { not: TopupStatus.PENDING } },
      orderBy: { createdAt: 'desc' },
      skip: historyPage.skip,
      take: historyPage.pageSize,
      include: { user: true },
    }),
    prisma.topupRequest.count({ where: { status: { not: TopupStatus.PENDING } } }),
    prisma.user.count(),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Admin · Wallet"
        title={
          <>
            Top-up <span className="font-serif italic font-normal">control center</span>.
          </>
        }
        subtitle="Approve or reject pending top-ups · review history."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={String(pendingTotal)} highlight={pendingTotal > 0} />
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="Total wallet balance" value={formatUSD(totalBalance._sum.balance ?? 0)} />
      </div>

      <section className="mt-12">
        <h2 className="mb-4 border-b border-ink/15 pb-2 font-display text-lg font-extrabold tracking-tight text-ink">
          Pending requests
        </h2>
        {pending.length === 0 ? (
          <p className="font-serif italic text-ink-muted">No pending requests.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.user.name}</div>
                        <div className="font-mono text-[10px] text-ink-muted">{t.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-display text-base font-extrabold">
                        {formatUSD(t.amount)}
                      </td>
                      <td className="px-4 py-3 font-serif italic text-ink-muted">{t.note ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <TopupActions topupId={t.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ServerTablePagination
              currentPage={pendingPage.page}
              totalItems={pendingTotal}
              pageSize={pendingPage.pageSize}
              buildHref={(p) =>
                buildTablePageHref('/admin/wallet', { page: params.page }, p, 'pendingPage')
              }
            />
          </>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 border-b border-ink/15 pb-2 font-display text-lg font-extrabold tracking-tight text-ink">
          History
        </h2>
        <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3">{t.user.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(t.amount)}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {t.reviewedAt ? formatDate(t.reviewedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ServerTablePagination
          currentPage={historyPage.page}
          totalItems={historyTotal}
          pageSize={historyPage.pageSize}
          buildHref={(p) =>
            buildTablePageHref('/admin/wallet', { pendingPage: params.pendingPage }, p)
          }
        />
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? 'border-amber-300 bg-amber-50' : 'border-line bg-paper-50'
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="mt-2 font-display text-2xl font-black tracking-tight text-ink">{value}</div>
    </div>
  );
}
