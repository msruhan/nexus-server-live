import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import { formatUSD, formatDate, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function UserDashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [wallet, totalImei, activeImei, recentImei, recentServer] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.imeiOrder.count({ where: { userId } }),
    prisma.imeiOrder.count({
      where: { userId, status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROCESS, OrderStatus.IN_PROCESS] } },
    }),
    prisma.imeiOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { service: true },
    }),
    prisma.serverOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { service: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Dashboard"
        title={
          <>
            Hello, <span className="font-serif italic font-normal">{session!.user.name?.split(' ')[0]}</span>.
          </>
        }
        subtitle="Quick view of your wallet, in-flight orders, and the dockets that just landed."
        actions={
          <Link
            href="/user/services/imei"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-primary-600"
          >
            Browse services
            <ArrowUpRight weight="bold" size={14} />
          </Link>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Wallet balance" value={formatUSD(wallet?.balance ?? 0)} accent="primary" link="/user/wallet#topup" />
        <KpiCard label="Total orders" value={String(totalImei)} link="/user/orders" />
        <KpiCard label="In-flight" value={String(activeImei)} link="/user/orders?status=active" />
      </div>

      {/* Recent IMEI orders */}
      <section className="mt-12">
        <SectionHeading title="Recent IMEI orders" href="/user/orders/imei" />
        {recentImei.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Your IMEI dockets will appear here once you submit your first one."
            action={
              <Link
                href="/user/services/imei"
                className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper"
              >
                Browse IMEI services
              </Link>
            }
          />
        ) : (
          <OrderTable
            rows={recentImei.map((o) => ({
              id: o.id,
              code: o.orderCode,
              service: o.service.title,
              status: o.status,
              price: o.price,
              imei: o.imei,
              when: o.createdAt,
            }))}
            type="imei"
          />
        )}
      </section>

      {/* Recent server orders */}
      <section className="mt-12">
        <SectionHeading title="Recent server orders" href="/user/orders/server" />
        {recentServer.length === 0 ? (
          <EmptyState title="No server orders yet" description="Try a remote FRP bypass or firmware flash." />
        ) : (
          <OrderTable
            rows={recentServer.map((o) => ({
              id: o.id,
              code: o.orderCode,
              service: o.service.title,
              status: o.status,
              price: o.price,
              imei: o.email ?? '—',
              when: o.createdAt,
            }))}
            type="server"
          />
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  link,
  accent,
}: {
  label: string;
  value: string;
  link?: string;
  accent?: 'primary';
}) {
  const wrap = (children: React.ReactNode) =>
    link ? (
      <Link href={link} className="group block">
        {children}
      </Link>
    ) : (
      <div>{children}</div>
    );
  return wrap(
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-card-hover ${
        accent === 'primary'
          ? 'border-primary-700 bg-primary-500 text-paper hover:bg-primary-600'
          : 'border-line bg-paper-50 hover:border-ink'
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          accent === 'primary' ? 'text-paper/70' : 'text-ink-muted'
        }`}
      >
        {label}
      </div>
      <div className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">{value}</div>
      {link && (
        <ArrowUpRight
          weight="bold"
          size={16}
          className={`absolute right-4 top-4 transition-transform group-hover:rotate-45 ${
            accent === 'primary' ? 'text-paper/70' : 'text-ink-soft'
          }`}
        />
      )}
    </div>,
  );
}

function SectionHeading({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b border-ink/15 pb-2">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      <Link
        href={href}
        className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        View all →
      </Link>
    </div>
  );
}

function OrderTable({
  rows,
  type,
}: {
  rows: Array<{
    id: string;
    code: string;
    service: string;
    status: string;
    price: Parameters<typeof formatUSD>[0];
    imei: string;
    when: Date;
  }>;
  type: 'imei' | 'server';
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Service</th>
            <th className="hidden px-4 py-3 sm:table-cell">IMEI</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="hidden px-4 py-3 lg:table-cell">When</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-line last:border-0 transition-colors hover:bg-paper-100"
            >
              <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
              <td className="px-4 py-3 font-medium text-ink">{r.service}</td>
              <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted sm:table-cell">{r.imei}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3 text-right font-mono">{formatUSD(r.price)}</td>
              <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">{relativeTime(r.when)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/user/orders/${r.id}?type=${type}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-primary-600"
                >
                  Open <ArrowUpRight weight="bold" size={11} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
