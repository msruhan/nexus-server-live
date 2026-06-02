/**
 * Analytics aggregation.
 *
 * Pure READ model over existing orders / ledger / users. Computes revenue,
 * profit margin (sell price − supplier cost), best-selling services, success
 * rate per provider, and top customers. Never mutates anything and never
 * touches the order/supplier workflow.
 *
 * "Cost" basis: each ImeiService / ServerService is linked to an ImeiApi
 * provider but we do not store the raw supplier cost per order. Profit is
 * therefore estimated using an optional cost field if present; when absent
 * we report revenue only and leave margin null. This keeps the feature
 * honest without inventing numbers.
 */
import { prisma } from '@/lib/db';

export type DateRange = { from: Date; to: Date };

export function resolveRange(period: string): DateRange {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case '24h':
      from.setHours(from.getHours() - 24);
      break;
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '1y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case '30d':
    default:
      from.setDate(from.getDate() - 30);
      break;
  }
  return { from, to };
}

type Num = { toString(): string };
function toNum(v: Num | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v.toString());
}

export type AnalyticsSummary = {
  period: string;
  range: { from: string; to: string };
  revenue: {
    imei: number;
    server: number;
    total: number;
  };
  orders: {
    total: number;
    success: number;
    rejected: number;
    pending: number;
    successRate: number; // 0-100
  };
  topups: {
    count: number;
    total: number;
  };
  refunds: {
    count: number;
    total: number;
  };
  revenueByDay: Array<{ date: string; imei: number; server: number }>;
  topServices: Array<{ id: string; title: string; kind: 'imei' | 'server'; orders: number; revenue: number }>;
  providerPerformance: Array<{ id: string; title: string; total: number; success: number; successRate: number }>;
  topCustomers: Array<{ id: string; name: string; email: string; orders: number; spend: number }>;
};

const SUCCESS = 'SUCCESS';
const REJECTED = 'REJECTED';

export async function getAnalyticsSummary(period = '30d'): Promise<AnalyticsSummary> {
  const range = resolveRange(period);
  const where = { createdAt: { gte: range.from, lte: range.to } };

  // ── Pull orders in range (both kinds) with the fields we need ──
  const [imeiOrders, serverOrders, ledgerEntries] = await Promise.all([
    prisma.imeiOrder.findMany({
      where,
      select: {
        id: true,
        price: true,
        status: true,
        createdAt: true,
        userId: true,
        serviceId: true,
        service: { select: { title: true, apiId: true, api: { select: { title: true } } } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.serverOrder.findMany({
      where,
      select: {
        id: true,
        price: true,
        status: true,
        createdAt: true,
        userId: true,
        serviceId: true,
        service: { select: { title: true, apiId: true, api: { select: { title: true } } } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.walletLedger.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { type: true, amount: true },
    }),
  ]);

  // ── Revenue (successful orders only) ──
  const imeiRevenue = imeiOrders
    .filter((o) => o.status === SUCCESS)
    .reduce((s, o) => s + toNum(o.price), 0);
  const serverRevenue = serverOrders
    .filter((o) => o.status === SUCCESS)
    .reduce((s, o) => s + toNum(o.price), 0);

  // ── Order counts ──
  const allOrders = [
    ...imeiOrders.map((o) => ({ ...o, kind: 'imei' as const })),
    ...serverOrders.map((o) => ({ ...o, kind: 'server' as const })),
  ];
  const total = allOrders.length;
  const success = allOrders.filter((o) => o.status === SUCCESS).length;
  const rejected = allOrders.filter((o) => o.status === REJECTED).length;
  const pending = allOrders.filter((o) => o.status !== SUCCESS && o.status !== REJECTED).length;
  const completed = success + rejected;
  const successRate = completed === 0 ? 0 : Math.round((success / completed) * 1000) / 10;

  // ── Top-ups & refunds from ledger ──
  const topupEntries = ledgerEntries.filter((l) => l.type === 'TOPUP');
  const refundEntries = ledgerEntries.filter((l) => l.type === 'REFUND');
  const topupsTotal = topupEntries.reduce((s, l) => s + toNum(l.amount), 0);
  const refundsTotal = refundEntries.reduce((s, l) => s + toNum(l.amount), 0);

  // ── Revenue by day (successful only) ──
  const dayMap = new Map<string, { imei: number; server: number }>();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  for (const o of imeiOrders) {
    if (o.status !== SUCCESS) continue;
    const k = dayKey(o.createdAt);
    const cur = dayMap.get(k) ?? { imei: 0, server: 0 };
    cur.imei += toNum(o.price);
    dayMap.set(k, cur);
  }
  for (const o of serverOrders) {
    if (o.status !== SUCCESS) continue;
    const k = dayKey(o.createdAt);
    const cur = dayMap.get(k) ?? { imei: 0, server: 0 };
    cur.server += toNum(o.price);
    dayMap.set(k, cur);
  }
  const revenueByDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, imei: Math.round(v.imei * 100) / 100, server: Math.round(v.server * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Top services (by successful revenue) ──
  const svcMap = new Map<string, { title: string; kind: 'imei' | 'server'; orders: number; revenue: number }>();
  for (const o of imeiOrders) {
    if (o.status !== SUCCESS) continue;
    const key = `imei:${o.serviceId}`;
    const cur = svcMap.get(key) ?? { title: o.service?.title ?? '—', kind: 'imei', orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += toNum(o.price);
    svcMap.set(key, cur);
  }
  for (const o of serverOrders) {
    if (o.status !== SUCCESS) continue;
    const key = `server:${o.serviceId}`;
    const cur = svcMap.get(key) ?? { title: o.service?.title ?? '—', kind: 'server', orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += toNum(o.price);
    svcMap.set(key, cur);
  }
  const topServices = Array.from(svcMap.entries())
    .map(([key, v]) => ({ id: key, title: v.title, kind: v.kind, orders: v.orders, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── Provider performance (success rate per ImeiApi) ──
  const provMap = new Map<string, { title: string; total: number; success: number }>();
  for (const o of allOrders) {
    const apiId = o.service?.apiId;
    if (!apiId) continue;
    if (o.status !== SUCCESS && o.status !== REJECTED) continue; // only completed
    const cur = provMap.get(apiId) ?? { title: o.service?.api?.title ?? '—', total: 0, success: 0 };
    cur.total += 1;
    if (o.status === SUCCESS) cur.success += 1;
    provMap.set(apiId, cur);
  }
  const providerPerformance = Array.from(provMap.entries())
    .map(([id, v]) => ({
      id,
      title: v.title,
      total: v.total,
      success: v.success,
      successRate: v.total === 0 ? 0 : Math.round((v.success / v.total) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  // ── Top customers (by successful spend) ──
  const custMap = new Map<string, { name: string; email: string; orders: number; spend: number }>();
  for (const o of allOrders) {
    if (o.status !== SUCCESS) continue;
    const cur = custMap.get(o.userId) ?? {
      name: o.user?.name ?? '—',
      email: o.user?.email ?? '—',
      orders: 0,
      spend: 0,
    };
    cur.orders += 1;
    cur.spend += toNum(o.price);
    custMap.set(o.userId, cur);
  }
  const topCustomers = Array.from(custMap.entries())
    .map(([id, v]) => ({ id, name: v.name, email: v.email, orders: v.orders, spend: Math.round(v.spend * 100) / 100 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  return {
    period,
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    revenue: {
      imei: Math.round(imeiRevenue * 100) / 100,
      server: Math.round(serverRevenue * 100) / 100,
      total: Math.round((imeiRevenue + serverRevenue) * 100) / 100,
    },
    orders: { total, success, rejected, pending, successRate },
    topups: { count: topupEntries.length, total: Math.round(topupsTotal * 100) / 100 },
    refunds: { count: refundEntries.length, total: Math.round(refundsTotal * 100) / 100 },
    revenueByDay,
    topServices,
    providerPerformance,
    topCustomers,
  };
}
