/**
 * GET /api/admin/orders/export?kind=imei|server|all&status=all|active|success|refunded
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { toCsv } from '@/lib/csv';
import {
  extractServerDeviceValue,
  imeiOrderStatusWhere,
  serverOrderStatusWhere,
  resolveOrderSourceTab,
  resolveOrderStatusTab,
  type OrderKind,
} from '@/lib/admin-orders-query';

const CSV_HEADERS = [
  'Type',
  'Order Code',
  'User Name',
  'User Email',
  'Service',
  'IMEI',
  'Serial Number',
  'Status',
  'Price (USD)',
  'Created At',
  'Completed At',
  'Reference ID',
  'Result Code',
];

async function requireExportAccess(kind: OrderKind) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role === 'ADMIN') return session;
  if (role !== 'SUB_ADMIN') return null;

  if (kind === 'imei') {
    return (await hasPermission(session.user.id, role, 'viewImeiOrders')) ? session : null;
  }
  if (kind === 'server') {
    return (await hasPermission(session.user.id, role, 'viewServerOrders')) ? session : null;
  }

  const [imei, server] = await Promise.all([
    hasPermission(session.user.id, role, 'viewImeiOrders'),
    hasPermission(session.user.id, role, 'viewServerOrders'),
  ]);
  return imei || server ? session : null;
}

function canExportImei(kind: OrderKind, role: string, userId: string): Promise<boolean> {
  if (role === 'ADMIN') return Promise.resolve(kind !== 'server');
  if (kind === 'server') return Promise.resolve(false);
  return hasPermission(userId, 'SUB_ADMIN', 'viewImeiOrders');
}

function canExportServer(kind: OrderKind, role: string, userId: string): Promise<boolean> {
  if (role === 'ADMIN') return Promise.resolve(kind !== 'imei');
  if (kind === 'imei') return Promise.resolve(false);
  return hasPermission(userId, 'SUB_ADMIN', 'viewServerOrders');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sourceTab = resolveOrderSourceTab(searchParams.get('kind') ?? undefined);
  const statusTab = resolveOrderStatusTab(searchParams.get('status') ?? undefined);
  const kind = sourceTab.key as OrderKind;

  const session = await requireExportAccess(kind);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const role = (session.user as { role?: string }).role ?? 'USER';
  const imeiWhere = imeiOrderStatusWhere(statusTab.key);
  const serverWhere = serverOrderStatusWhere(statusTab.key);
  const include = { service: true, user: true } as const;

  const [exportImei, exportServer] = await Promise.all([
    canExportImei(kind, role, session.user.id),
    canExportServer(kind, role, session.user.id),
  ]);

  const [imeiOrders, serverOrders] = await Promise.all([
    exportImei
      ? prisma.imeiOrder.findMany({ where: imeiWhere, orderBy: { createdAt: 'desc' }, include })
      : Promise.resolve([]),
    exportServer
      ? prisma.serverOrder.findMany({ where: serverWhere, orderBy: { createdAt: 'desc' }, include })
      : Promise.resolve([]),
  ]);

  const rows: Array<Array<string | number>> = [
    ...imeiOrders.map((o) => [
      'IMEI',
      o.orderCode,
      o.user.name,
      o.user.email,
      o.service.title,
      o.imei,
      o.serialNumber ?? '',
      o.status,
      Number(o.price),
      o.createdAt.toISOString(),
      o.completedAt?.toISOString() ?? '',
      o.referenceId ?? '',
      o.code ?? '',
    ]),
    ...serverOrders.map((o) => {
      const device = extractServerDeviceValue(o.requiredFields);
      return [
        'Server',
        o.orderCode,
        o.user.name,
        o.user.email,
        o.service.title,
        device.imei ?? '',
        device.serialNumber ?? '',
        o.status,
        Number(o.price),
        o.createdAt.toISOString(),
        o.completedAt?.toISOString() ?? '',
        o.referenceId ?? '',
        o.code ?? '',
      ];
    }),
  ].sort((a, b) => String(b[9]).localeCompare(String(a[9])));

  const csv = toCsv(CSV_HEADERS, rows);
  const filename = `orders-${kind}-${statusTab.key}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
