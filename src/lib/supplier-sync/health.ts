import { prisma } from '@/lib/db';
import { toNum } from './money';

export type SupplierHealthRow = {
  id: string;
  title: string;
  status: string;
  cachedBalance: number | null;
  cachedBalanceAt: string | null;
  lastSyncAt: string | null;
  syncRequiresReconnect: boolean;
  orders: { total: number; success: number; rejected: number; successRate: number };
  avgDeliveryMinutes: number | null;
};

export async function getSupplierHealthPanel(days = 30): Promise<SupplierHealthRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const apis = await prisma.imeiApi.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      status: true,
      cachedBalance: true,
      cachedBalanceAt: true,
      lastSyncAt: true,
      syncRequiresReconnect: true,
    },
  });

  const [imeiOrders, serverOrders] = await Promise.all([
    prisma.imeiOrder.findMany({
      where: { createdAt: { gte: since }, status: { in: ['SUCCESS', 'REJECTED', 'IN_PROCESS', 'PENDING'] } },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
        service: { select: { apiId: true } },
      },
    }),
    prisma.serverOrder.findMany({
      where: { createdAt: { gte: since }, status: { in: ['SUCCESS', 'REJECTED', 'IN_PROCESS', 'PENDING'] } },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
        service: { select: { apiId: true } },
      },
    }),
  ]);

  const stats = new Map<
    string,
    { total: number; success: number; rejected: number; deliveryMs: number[] }
  >();

  for (const o of [...imeiOrders, ...serverOrders]) {
    const apiId = o.service?.apiId;
    if (!apiId) continue;
    const cur = stats.get(apiId) ?? { total: 0, success: 0, rejected: 0, deliveryMs: [] };
    cur.total += 1;
    if (o.status === 'SUCCESS') {
      cur.success += 1;
      if (o.completedAt) {
        cur.deliveryMs.push(o.completedAt.getTime() - o.createdAt.getTime());
      }
    } else if (o.status === 'REJECTED') {
      cur.rejected += 1;
    }
    stats.set(apiId, cur);
  }

  return apis.map((api) => {
    const s = stats.get(api.id) ?? { total: 0, success: 0, rejected: 0, deliveryMs: [] };
    const completed = s.success + s.rejected;
    const avgMs =
      s.deliveryMs.length > 0
        ? s.deliveryMs.reduce((a, b) => a + b, 0) / s.deliveryMs.length
        : null;
    return {
      id: api.id,
      title: api.title,
      status: api.status,
      cachedBalance: api.cachedBalance != null ? toNum(api.cachedBalance) : null,
      cachedBalanceAt: api.cachedBalanceAt?.toISOString() ?? null,
      lastSyncAt: api.lastSyncAt?.toISOString() ?? null,
      syncRequiresReconnect: api.syncRequiresReconnect,
      orders: {
        total: s.total,
        success: s.success,
        rejected: s.rejected,
        successRate: completed === 0 ? 0 : Math.round((s.success / completed) * 1000) / 10,
      },
      avgDeliveryMinutes: avgMs == null ? null : Math.round(avgMs / 60_000),
    };
  });
}
