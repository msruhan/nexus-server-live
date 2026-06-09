import { OrderStatus } from '@/lib/constants';
import type { Prisma } from '@prisma/client';

export type OrderKind = 'all' | 'imei' | 'server';
export type OrderStatusTab = 'all' | 'active' | 'success' | 'refunded';

export const ORDER_STATUS_TABS: Array<{
  key: OrderStatusTab;
  label: string;
  filter?: Prisma.ImeiOrderWhereInput['status'];
}> = [
  { key: 'all', label: 'All', filter: undefined },
  {
    key: 'active',
    label: 'In flight',
    filter: { in: [OrderStatus.PENDING, OrderStatus.IN_PROCESS] },
  },
  { key: 'success', label: 'Success', filter: { equals: OrderStatus.SUCCESS } },
  {
    key: 'refunded',
    label: 'Refunded',
    filter: { in: [OrderStatus.REJECTED, OrderStatus.CANCELLED] },
  },
];

export const ORDER_SOURCE_TABS = [
  { key: 'all', label: 'All orders' },
  { key: 'imei', label: 'Order IMEI' },
  { key: 'server', label: 'Order Server' },
] as const;

export function resolveOrderStatusTab(status?: string) {
  return ORDER_STATUS_TABS.find((t) => t.key === status) ?? ORDER_STATUS_TABS[0];
}

export function resolveOrderSourceTab(kind?: string): (typeof ORDER_SOURCE_TABS)[number] {
  return ORDER_SOURCE_TABS.find((t) => t.key === kind) ?? ORDER_SOURCE_TABS[0];
}

export function imeiOrderStatusWhere(tab: OrderStatusTab): Prisma.ImeiOrderWhereInput {
  const match = ORDER_STATUS_TABS.find((t) => t.key === tab);
  return match?.filter ? { status: match.filter } : {};
}

export function serverOrderStatusWhere(tab: OrderStatusTab): Prisma.ServerOrderWhereInput {
  const match = ORDER_STATUS_TABS.find((t) => t.key === tab);
  if (!match?.filter) return {};
  return { status: match.filter as unknown as Prisma.ServerOrderWhereInput['status'] };
}

export function extractServerDeviceValue(requiredFieldsJson: string | null): {
  serialNumber: string | null;
  imei: string | null;
} {
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
