import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD, formatDate, relativeTime } from '@/lib/format';
import { listEnabledGateways } from '@/lib/payment/registry';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { StatusPill } from '@/components/ui/StatusPill';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import { OnlineTopupForm } from './topup-online/OnlineTopupForm';

export const dynamic = 'force-dynamic';

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);

  const [wallet, ledger, ledgerTotal, gateways] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletLedger.findMany({
      where: { wallet: { userId } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.walletLedger.count({ where: { wallet: { userId } } }),
    listEnabledGateways(),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Wallet"
        title={
          <>
            Your <span className="font-serif italic font-normal">ledger</span>.
          </>
        }
        subtitle="Top up via payment gateway · every TOPUP, PAYMENT, and REFUND is recorded in your ledger."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-primary-700 bg-primary-500 p-5 text-paper sm:col-span-2 lg:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/70">
            Available balance
          </div>
          <div className="mt-3 min-w-0 overflow-hidden text-ellipsis font-display text-[clamp(1.55rem,3.7vw,2.3rem)] font-black leading-[1.1] tracking-tight [overflow-wrap:anywhere]">
            {formatUSD(wallet?.balance ?? 0)}
          </div>
          <p className="mt-2 text-xs font-serif italic text-paper/80 sm:text-sm">
            Updated {wallet ? relativeTime(wallet.updatedAt) : 'never'}
          </p>
          {gateways.length > 0 && (
            <Link
              href="#topup"
              className="mt-4 inline-flex rounded-full bg-paper px-4 py-2 text-xs font-bold text-primary-700 hover:bg-paper/90"
            >
              Top up online →
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5 sm:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Total top-ups
          </div>
          <div className="mt-3 font-display text-2xl font-extrabold text-ink">
            {ledger.filter((l) => l.type === 'TOPUP').length}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-paper-50 p-5 sm:col-span-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Refunds received
          </div>
          <div className="mt-3 font-display text-2xl font-extrabold text-ink">
            {ledger.filter((l) => l.type === 'REFUND').length}
          </div>
        </div>
      </div>

      <section id="topup" className="mt-12 scroll-mt-8">
        <h2 className="border-b border-ink/15 pb-3 font-display text-xl font-extrabold tracking-tight text-ink">
          Top up online
        </h2>
        <p className="mt-3 max-w-xl font-serif italic text-ink-muted">
          Pay with USDT, PayPal, or card. Balance is credited automatically after payment is confirmed.
        </p>
        {gateways.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-paper-50 px-6 py-10 font-serif italic text-ink-muted">
            Online top-up is not available yet. Please contact support or check back later.
          </p>
        ) : (
          <div className="mt-6 max-w-3xl">
            <OnlineTopupForm gateways={gateways} />
          </div>
        )}
      </section>

      {/* Ledger */}
      <section className="mt-14">
        <h2 className="mb-4 border-b border-ink/15 pb-3 font-display text-xl font-extrabold tracking-tight text-ink">
          Ledger
        </h2>
        {ledger.length === 0 ? (
          <p className="font-serif italic text-ink-muted">No entries yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={l.type} /></td>
                    <td className="px-4 py-3 text-ink-muted">{l.description ?? '—'}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${l.type === 'PAYMENT' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {l.type === 'PAYMENT' ? '−' : '+'} {formatUSD(l.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatUSD(l.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ServerTablePagination
          currentPage={page}
          totalItems={ledgerTotal}
          pageSize={pageSize}
          buildHref={(p) => buildTablePageHref('/user/wallet', {}, p)}
        />
      </section>
    </div>
  );
}
