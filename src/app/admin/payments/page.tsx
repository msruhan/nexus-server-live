import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { buildTablePageHref, DEFAULT_TABLE_PAGE_SIZE, parseTablePage } from '@/lib/table-pagination';
import { PaymentSettingsForm } from './PaymentSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: true,
      paymentUsdtRate: true,
      paymentPaypalEnabled: true,
      paymentPaypalClientId: true,
      paymentPaypalMode: true,
      paymentPaypalWebhookId: true,
      paymentStripeEnabled: true,
      paymentStripePublishableKey: true,
    },
  });

  const [recentIntents, totalIntents] = await Promise.all([
    prisma.paymentIntent.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.paymentIntent.count(),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · payments"
        title={
          <>
            Payment <span className="font-serif italic font-normal">gateways</span>.
          </>
        }
        subtitle="Enable USDT TRC-20 (auto-credit) plus PayPal/Stripe stubs. Card flows roll out in stages."
      />
      <PaymentSettingsForm
        initial={{
          paymentUsdtPortalEnabled: settings?.paymentUsdtPortalEnabled ?? false,
          paymentUsdtPortalEmail: settings?.paymentUsdtPortalEmail ?? '',
          paymentUsdtRate: settings?.paymentUsdtRate ? Number(settings.paymentUsdtRate) : 1.0,
          paymentPaypalEnabled: settings?.paymentPaypalEnabled ?? false,
          paymentPaypalClientId: settings?.paymentPaypalClientId ?? '',
          paymentPaypalMode: settings?.paymentPaypalMode ?? 'sandbox',
          paymentPaypalWebhookId: settings?.paymentPaypalWebhookId ?? '',
          paymentStripeEnabled: settings?.paymentStripeEnabled ?? false,
          paymentStripePublishableKey: settings?.paymentStripePublishableKey ?? '',
        }}
      />

      <h2 className="mt-12 font-display text-xl font-extrabold tracking-tight">Recent intents</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Gateway</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">TX</th>
            </tr>
          </thead>
          <tbody>
            {recentIntents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                  No intents yet.
                </td>
              </tr>
            ) : (
              recentIntents.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                    {i.createdAt.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{i.user?.email}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{i.gateway}</td>
                  <td className="px-3 py-2 font-mono">
                    ${i.amount.toString()}
                    {i.cryptoAmount && (
                      <div className="text-[10px] text-ink-muted">{i.cryptoAmount} {i.cryptoAsset}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        i.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : i.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-ink-muted">
                    {i.txHash ? i.txHash.slice(0, 12) + '…' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServerTablePagination
        currentPage={page}
        totalItems={totalIntents}
        pageSize={pageSize}
        buildHref={(p) => buildTablePageHref('/admin/payments', {}, p)}
      />
    </div>
  );
}
