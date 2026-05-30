import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import { formatUSD, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const since24h = new Date(Date.now() - 24 * 60 * 60_000);

  const [
    totalUsers,
    totalOrders,
    pending,
    successToday,
    revenueToday,
    refundedToday,
    pendingTopup,
    totalProviders,
    activeProviders,
    recent,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.imeiOrder.count(),
    prisma.imeiOrder.count({
      where: { status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROCESS, OrderStatus.IN_PROCESS] } },
    }),
    prisma.imeiOrder.count({
      where: { status: OrderStatus.SUCCESS, completedAt: { gte: since24h } },
    }),
    prisma.imeiOrder.aggregate({
      where: { status: OrderStatus.SUCCESS, completedAt: { gte: since24h } },
      _sum: { price: true },
    }),
    prisma.imeiOrder.count({
      where: { status: OrderStatus.REJECTED, completedAt: { gte: since24h } },
    }),
    prisma.topupRequest.count({ where: { status: 'PENDING' } }),
    prisma.imeiApi.count(),
    prisma.imeiApi.count({ where: { status: 'ACTIVE' } }),
    prisma.imeiOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { service: true, user: true },
    }),
  ]);

  const totalCompleted = await prisma.imeiOrder.count({
    where: { status: { in: [OrderStatus.SUCCESS, OrderStatus.REJECTED] } },
  });
  const totalSuccess = await prisma.imeiOrder.count({ where: { status: OrderStatus.SUCCESS } });
  const successRate =
    totalCompleted === 0 ? 0 : Math.round((totalSuccess / totalCompleted) * 1000) / 10;

  return (
    <div>
      <PageHeader
        section="§ Dashboard"
        title={
          <>
            The bureau&rsquo;s <span className="font-serif italic font-normal">vital</span> signs.
          </>
        }
        subtitle="Real-time view across orders, revenue, providers, and pending actions."
      />

      {/* Top KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue (24h)" value={formatUSD(revenueToday._sum.price ?? 0)} accent />
        <Kpi label="Successful (24h)" value={String(successToday)} />
        <Kpi label="Success rate" value={`${successRate}%`} />
        <Kpi label="In flight" value={String(pending)} highlight={pending > 0} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total users" value={String(totalUsers)} />
        <Kpi label="Total orders" value={String(totalOrders)} />
        <Kpi label="Active providers" value={`${activeProviders} / ${totalProviders}`} />
        <Kpi label="Pending top-ups" value={String(pendingTopup)} highlight={pendingTopup > 0} link="/admin/wallet" />
      </div>

      {/* Recent orders */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between border-b border-ink/15 pb-2">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Recent dockets
          </h2>
          <Link
            href="/admin/orders"
            className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="hidden px-4 py-3 lg:table-cell">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{o.user.name}</div>
                    <div className="font-mono text-[10px] text-ink-muted">{o.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.service.title}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(o.price)}</td>
                  <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">
                    {relativeTime(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${o.id}?type=imei`} className="text-xs font-bold text-ink hover:text-primary-600">
                      Open <ArrowUpRight weight="bold" size={11} className="inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  highlight,
  link,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
  link?: string;
}) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
        accent
          ? 'border-primary-700 bg-primary-500 text-paper'
          : highlight
            ? 'border-amber-300 bg-amber-50 text-amber-900 hover:shadow-card-hover'
            : 'border-line bg-paper-50 hover:border-ink hover:shadow-card-hover'
      } ${link ? 'cursor-pointer' : ''}`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          accent ? 'text-paper/70' : highlight ? 'text-amber-700' : 'text-ink-muted'
        }`}
      >
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-black tracking-tight lg:text-3xl">{value}</div>
      {link && (
        <ArrowUpRight
          weight="bold"
          size={14}
          className={`absolute right-3 top-3 ${accent ? 'text-paper/70' : 'text-ink-soft'}`}
        />
      )}
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}
