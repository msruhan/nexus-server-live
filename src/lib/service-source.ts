import type { ServiceSourceType } from '@prisma/client';

export const MANUAL_REVIEW_COMMENT =
  'Pending manual review by admin. This service is not linked to an upstream provider.';

export function isManualSource(sourceType: ServiceSourceType | string | null | undefined): boolean {
  return sourceType === 'MANUAL';
}

export function isProviderSyncedSource(
  sourceType: ServiceSourceType | string | null | undefined,
): boolean {
  return sourceType === 'PROVIDER_SYNCED';
}

export function buildManualInternalRef(kind: 'imei' | 'server', nextNumber: number): string {
  const prefix = kind === 'imei' ? 'MAN-IMEI-' : 'MAN-SRV-';
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}
