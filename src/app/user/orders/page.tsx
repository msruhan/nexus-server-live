import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import type { ImeiOrderStatus, ServerOrderStatus } from '@prisma/client';
import { formatUSD, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const STATUS_TABS: Array<{ key: string; label: string; statuses?: string[] }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In flight', statuses: [OrderStatus.PENDING, OrderStatus.IN_PROCESS] },
  { key: 'success', label: 'Successful', statuses: [OrderStatus.SUCCESS] },
  { key: 'refunded', label: 'Refunded', statuses: [OrderStatus.REJECTED, OrderStatus.CANCELLED] },
];

export default async function UserOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { status } = await searchParams;
  const tab = STATUS_TABS.find((t) => t.key === status) ?? STATUS_TABS[0];

  const statusFilter = tab.statuses
    ? { status: { in: tab.statuses as ImeiOrderStatus[] } }
    : {};

  const [imei, server] = await Promise.all([
    prisma.imeiOrder.findMany({
      where: { userId, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { service: { select: { title: true } } },
    }),
    prisma.serverOrder.findMany({
      where: {
        userId,
        ...(tab.statuses
          ? { status: { in: tab.statuses as ServerOrderStatus[] } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { service: { select: { title: true } } },
    }),
  ]);

  const all = [
    ...imei.map((o) => ({
      id: o.id,
      type: 'imei' as const,
      code: o.orderCode,
      service: o.service.title,
      status: o.status,
      price: o.price,
      imei: o.imei,
      when: o.createdAt,
    })),
    ...server.map((o) => ({
      id: o.id,
      type: 'server' as const,
      code: o.orderCode,
      service: o.service.title,
      status: o.status,
      price: o.price,
      imei: o.email ?? '—',
      when: o.createdAt,
    })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <div>
      <PageHeader
        section="§ Orders"
        title={
          <>
            Your <span className="font-serif italic font-normal">dockets</span>.
          </>
        }
        subtitle="Every order you&rsquo;ve submitted, with timestamps, status, and result codes."
      />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {STATUS_TABS.map((t) => {
          const active = tab.key === t.key;
          return (
            <Link
              key={t.key}
              href={t.key === 'all' ? '/user/orders' : `/user/orders?status=${t.key}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {all.length === 0 ? (
        <EmptyState
          title="No orders here yet"
          description="Browse the catalog and submit your first docket."
          action={
            <Link href="/user/services/imei" className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper">
              Browse catalog
            </Link>
          }
        />
      ) : (
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
              {all.map((o) => (
                <tr key={`${o.type}-${o.id}`} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="mr-2 rounded bg-ink/5 px-1.5 py-0.5 font-bold uppercase text-ink-muted">
                      {o.type === 'imei' ? 'A' : 'B'}
                    </span>
                    {o.code}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.service}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted sm:table-cell">{o.imei}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(o.price)}</td>
                  <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">{relativeTime(o.when)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/user/orders/${o.id}?type=${o.type}`}
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
      )}
    </div>
  );
}
