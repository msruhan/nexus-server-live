import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUSD, formatDate, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TopupForm } from './TopupForm';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [wallet, ledger, topups] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletLedger.findMany({
      where: { wallet: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.topupRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
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
        subtitle="Every TOPUP, PAYMENT, REFUND — recorded immutably with timestamps."
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

      {/* Top-up form */}
      <section className="mt-12 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="border-b border-ink/15 pb-3 font-display text-xl font-extrabold tracking-tight text-ink">
            Request top-up
          </h2>
          <p className="mt-3 max-w-sm font-serif italic text-ink-muted">
            Submit a top-up request. An admin will approve it and the balance will be credited to your wallet as a
            TOPUP ledger entry.
          </p>
          <div className="mt-3">
            <a
              href="/user/wallet/topup-online"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 underline-offset-4 hover:underline"
            >
              Or top up online (USDT / Card) →
            </a>
          </div>
          <div className="mt-6">
            <TopupForm />
          </div>
        </div>

        {/* Pending top-ups */}
        <div className="lg:col-span-7">
          <h2 className="border-b border-ink/15 pb-3 font-display text-xl font-extrabold tracking-tight text-ink">
            Top-up requests
          </h2>
          {topups.length === 0 ? (
            <p className="mt-4 font-serif italic text-ink-muted">No top-up requests yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-line">
              {topups.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-display text-base font-bold tracking-tight text-ink">
                      {formatUSD(t.amount)}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {formatDate(t.createdAt)}
                    </div>
                  </div>
                  <StatusPill status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
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
      </section>
    </div>
  );
}
