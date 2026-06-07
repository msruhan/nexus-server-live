import type { ImeiRequires } from '@/components/orders/ImeiOrderFields';

export type BulkDeviceField = 'imei' | 'serialNumber' | 'ecid';

export const MAX_BULK_ORDER_LINES = 50;

/** Bulk order applies when the service requires exactly one device identifier. */
export function resolveBulkDeviceField(requires: ImeiRequires): BulkDeviceField | null {
  const fields: BulkDeviceField[] = [];
  if (requires.imei) fields.push('imei');
  if (requires.sn) fields.push('serialNumber');
  if (requires.ecid) fields.push('ecid');
  if (fields.length !== 1) return null;
  return fields[0];
}

export function bulkDeviceFieldLabel(field: BulkDeviceField): string {
  if (field === 'imei') return 'IMEI';
  if (field === 'serialNumber') return 'Serial Number';
  return 'ECID';
}

export function parseBulkOrderLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
