import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/lib/constants';
import { formatUSD, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ServerTablePagination } from '@/components/ui/ServerTablePagination';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  buildTablePageHref,
  DEFAULT_TABLE_PAGE_SIZE,
  parseTablePage,
  tablePageCount,
} from '@/lib/table-pagination';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'all', label: 'All', filter: undefined },
  { key: 'active', label: 'In flight', filter: { in: [OrderStatus.PENDING, OrderStatus.IN_PROCESS] } },
  { key: 'success', label: 'Success', filter: { equals: OrderStatus.SUCCESS } },
  { key: 'refunded', label: 'Refunded', filter: { in: [OrderStatus.REJECTED, OrderStatus.CANCELLED] } },
];

const SOURCE_TABS = [
  { key: 'all', label: 'All orders' },
  { key: 'imei', label: 'Order IMEI' },
  { key: 'server', label: 'Order Server' },
] as const;

function buildOrdersHref(source: string, status: string, page?: number) {
  return buildTablePageHref('/admin/orders', {
    kind: source !== 'all' ? source : undefined,
    status: status !== 'all' ? status : undefined,
  }, page ?? 1);
}

function extractServerDeviceValue(requiredFieldsJson: string | null): { serialNumber: string | null; imei: string | null } {
  if (!requiredFieldsJson) return { serialNumber: null, imei: null };
  try {
    const parsed = JSON.parse(requiredFieldsJson) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { serialNumber: null, imei: null };
    }
    const values = parsed as Record<string, unknown>;
    const getText = (key: string) => {
      const value = values[key];
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed || null;
    };
    return {
      serialNumber: getText('sn') ?? getText('serial') ?? getText('serialnumber'),
      imei: getText('imei'),
    };
  } catch {
    return { serialNumber: null, imei: null };
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { status, kind } = params;
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];
  const sourceTab = SOURCE_TABS.find((t) => t.key === kind) ?? SOURCE_TABS[0];
  const where = tab.filter ? { status: tab.filter } : {};
  const { page, pageSize, skip } = parseTablePage(params.page, DEFAULT_TABLE_PAGE_SIZE);
  const fetchLimit = skip + pageSize;

  const [imei, server, imeiCount, serverCount] = await Promise.all([
    sourceTab.key === 'server'
      ? Promise.resolve([])
      : prisma.imeiOrder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: sourceTab.key === 'all' ? fetchLimit : pageSize,
          skip: sourceTab.key === 'all' ? 0 : skip,
          include: { service: true, user: true },
        }),
    sourceTab.key === 'imei'
      ? Promise.resolve([])
      : prisma.serverOrder.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: sourceTab.key === 'all' ? fetchLimit : pageSize,
          skip: sourceTab.key === 'all' ? 0 : skip,
          include: { service: true, user: true },
        }),
    sourceTab.key === 'server' ? Promise.resolve(0) : prisma.imeiOrder.count({ where }),
    sourceTab.key === 'imei' ? Promise.resolve(0) : prisma.serverOrder.count({ where }),
  ]);

  const total =
    sourceTab.key === 'imei'
      ? imeiCount
      : sourceTab.key === 'server'
        ? serverCount
        : imeiCount + serverCount;

  const merged = [
    ...imei.map((o) => ({
      id: o.id,
      type: 'imei' as const,
      code: o.orderCode,
      user: o.user.name,
      email: o.user.email,
      service: o.service.title,
      imei: o.imei,
      serialNumber: o.serialNumber,
      status: o.status,
      price: o.price,
      when: o.createdAt,
    })),
    ...server.map((o) => ({
      ...extractServerDeviceValue(o.requiredFields),
      id: o.id,
      type: 'server' as const,
      code: o.orderCode,
      user: o.user.name,
      email: o.user.email,
      service: o.service.title,
      status: o.status,
      price: o.price,
      when: o.createdAt,
    })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  const all =
    sourceTab.key === 'all' ? merged.slice(skip, skip + pageSize) : merged;
  const currentPage = Math.min(page, tablePageCount(total, pageSize));

  return (
    <div>
      <PageHeader
        section="§ Admin · Orders"
        title={
          <>
            All <span className="font-serif italic font-normal">dockets</span>.
          </>
        }
        subtitle={`Live view across both registers · ${total} total entries.`}
      />

      <div className="mb-3 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {SOURCE_TABS.map((t) => {
          const active = sourceTab.key === t.key;
          return (
            <Link
              key={t.key}
              href={buildOrdersHref(t.key, tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
        {TABS.map((t) => {
          const active = tab.key === t.key;
          return (
            <Link
              key={t.key}
              href={buildOrdersHref(sourceTab.key, t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Device</th>
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
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{o.user}</div>
                  <div className="font-mono text-[10px] text-ink-muted">{o.email}</div>
                </td>
                <td className="px-4 py-3">{o.service}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {o.serialNumber && <div className="break-all">{o.serialNumber}</div>}
                  {o.imei && <div className="break-all">{o.imei}</div>}
                  {!o.serialNumber && !o.imei && <span>—</span>}
                </td>
                <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                <td className="px-4 py-3 text-right font-mono">{formatUSD(o.price)}</td>
                <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">{relativeTime(o.when)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${o.id}?type=${o.type}`}
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

      <ServerTablePagination
        currentPage={currentPage}
        totalItems={total}
        pageSize={pageSize}
        buildHref={(p) => buildOrdersHref(sourceTab.key, tab.key, p)}
      />
    </div>
  );
}
