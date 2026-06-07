import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import type { ImeiOrderStatus } from '@prisma/client';
import { formatUSD, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildTablePageHref, parseTablePage, USER_ORDERS_PAGE_SIZE } from '@/lib/table-pagination';

export const dynamic = 'force-dynamic';

const STATUS_TABS: Array<{ key: string; label: string; statuses?: ImeiOrderStatus[] }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In flight', statuses: [OrderStatus.PENDING, OrderStatus.IN_PROCESS] as ImeiOrderStatus[] },
  { key: 'success', label: 'Successful', statuses: [OrderStatus.SUCCESS] as ImeiOrderStatus[] },
  { key: 'refunded', label: 'Refunded', statuses: [OrderStatus.REJECTED, OrderStatus.CANCELLED] as ImeiOrderStatus[] },
];

export default async function UserImeiOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;
  const tab = STATUS_TABS.find((t) => t.key === params.status) ?? STATUS_TABS[0];
  const { page, pageSize, skip } = parseTablePage(params.page, USER_ORDERS_PAGE_SIZE);
  const where = {
    userId,
    ...(tab.statuses ? { status: { in: tab.statuses } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.imeiOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { service: { select: { title: true } } },
    }),
    prisma.imeiOrder.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        section="§ Orders"
        title={
          <>
            Order <span className="font-serif italic font-normal">IMEI</span>.
          </>
        }
        subtitle="Your IMEI order history with status and result codes."
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {STATUS_TABS.map((t) => {
          const active = tab.key === t.key;
          return (
            <Link
              key={t.key}
              href={t.key === 'all' ? '/user/orders/imei' : `/user/orders/imei?status=${t.key}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No IMEI orders yet"
          description="Choose an IMEI service and submit your first order."
          action={
            <Link href="/user/services/imei" className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper">
              Browse IMEI services
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
                <th className="hidden px-4 py-3 sm:table-cell">Device</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="hidden px-4 py-3 lg:table-cell">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderCode}</td>
                  <td className="px-4 py-3 font-medium">{o.service.title}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted sm:table-cell">{o.imei}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(o.price)}</td>
                  <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">{relativeTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/user/orders/${o.id}?type=imei`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-primary-600"
                    >
                      Open <ArrowUpRight weight="bold" size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-paper-50 px-4 py-3">
            <ServerTablePagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              className="mt-0"
              buildHref={(p) =>
                buildTablePageHref('/user/orders/imei', {
                  status: tab.key !== 'all' ? tab.key : undefined,
                }, p)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

