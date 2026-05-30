/**
 * Read-only public order lookup helper.
 *
 * Looks up an order by its public `orderCode`. Returns a minimal,
 * sanitized payload safe to expose to anyone who knows the code.
 */
import { prisma } from '@/lib/db';
import { isValidOrderCode } from '@/lib/generate-order-code';

export type PublicOrderTrack = {
  kind: 'imei' | 'server';
  orderCode: string;
  status: string;
  serviceTitle: string;
  groupTitle: string | null;
  deviceMasked: string | null;
  ownerInitial: string;
  createdAt: string;
  processedAt: string | null;
  completedAt: string | null;
  supplierCode: string | null;
  supplierComments: string | null;
  hasResultFile: boolean;
};

function maskDevice(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return `${'*'.repeat(Math.max(0, trimmed.length - 1))}${trimmed.slice(-1)}`;
  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

function ownerInitial(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '·';
  return trimmed.charAt(0).toUpperCase();
}

export function isLikelyOrderCode(value: string): boolean {
  return isValidOrderCode(value);
}

export async function lookupOrderByCode(rawCode: string): Promise<PublicOrderTrack | null> {
  const code = rawCode.trim().toUpperCase();
  if (!isLikelyOrderCode(code)) return null;

  const imei = await prisma.imeiOrder.findUnique({
    where: { orderCode: code },
    select: {
      orderCode: true,
      status: true,
      imei: true,
      serialNumber: true,
      createdAt: true,
      processedAt: true,
      completedAt: true,
      code: true,
      comments: true,
      service: {
        select: {
          title: true,
          group: { select: { title: true } },
        },
      },
      user: { select: { name: true } },
    },
  });

  if (imei) {
    return {
      kind: 'imei',
      orderCode: imei.orderCode,
      status: imei.status,
      serviceTitle: imei.service?.title ?? '—',
      groupTitle: imei.service?.group?.title ?? null,
      deviceMasked: maskDevice(imei.serialNumber || imei.imei),
      ownerInitial: ownerInitial(imei.user?.name),
      createdAt: imei.createdAt.toISOString(),
      processedAt: imei.processedAt?.toISOString() ?? null,
      completedAt: imei.completedAt?.toISOString() ?? null,
      supplierCode: imei.code ?? null,
      supplierComments: imei.comments ?? null,
      hasResultFile: false,
    };
  }

  const server = await prisma.serverOrder.findUnique({
    where: { orderCode: code },
    select: {
      orderCode: true,
      status: true,
      createdAt: true,
      processedAt: true,
      completedAt: true,
      code: true,
      comments: true,
      service: {
        select: {
          title: true,
          box: { select: { title: true } },
        },
      },
      user: { select: { name: true } },
    },
  });

  if (!server) return null;

  return {
    kind: 'server',
    orderCode: server.orderCode,
    status: server.status,
    serviceTitle: server.service?.title ?? '—',
    groupTitle: server.service?.box?.title ?? null,
    deviceMasked: null,
    ownerInitial: ownerInitial(server.user?.name),
    createdAt: server.createdAt.toISOString(),
    processedAt: server.processedAt?.toISOString() ?? null,
    completedAt: server.completedAt?.toISOString() ?? null,
    supplierCode: server.code ?? null,
    supplierComments: server.comments ?? null,
    hasResultFile: typeof server.comments === 'string' && /https?:\/\//.test(server.comments),
  };
}
