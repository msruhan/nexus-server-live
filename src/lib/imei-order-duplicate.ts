import { prisma } from '@/lib/db'
import { stripSupplierHtml } from '@/lib/imei-public'

export type ActiveDeviceDuplicate = {
  id: string
  orderCode: string
  status: string
  referenceId: string | null
  createdAt: Date
  serviceTitle: string
  serviceId: string
}

/**
 * Find duplicate orders for the same device key:
 * - PENDING / IN_PROCESS: any service on the same supplier account (apiId)
 * - SUCCESS: exact same service (serviceId) — prevents repeat one-time orders
 */
export async function findActiveDeviceDuplicate(params: {
  apiId: string
  serviceId: string
  deviceKey: string
  excludeOrderId?: string
}): Promise<ActiveDeviceDuplicate | null> {
  const row = await prisma.imeiOrder.findFirst({
    where: {
      imei: params.deviceKey,
      ...(params.excludeOrderId ? { id: { not: params.excludeOrderId } } : {}),
      OR: [
        {
          status: { in: ['PENDING', 'IN_PROCESS'] },
          service: { apiId: params.apiId },
        },
        {
          status: 'SUCCESS',
          serviceId: params.serviceId,
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderCode: true,
      status: true,
      referenceId: true,
      createdAt: true,
      serviceId: true,
      service: { select: { title: true } },
    },
  })

  if (!row) return null
  return {
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    referenceId: row.referenceId,
    createdAt: row.createdAt,
    serviceId: row.serviceId,
    serviceTitle: row.service.title,
  }
}

export function deviceFieldLabel(
  requiresImei: boolean,
  requiresSn: boolean,
  requiresEcid = false,
): string {
  const parts = [
    requiresImei && 'IMEI',
    requiresSn && 'Serial Number',
    requiresEcid && 'ECID',
  ].filter(Boolean) as string[]
  if (parts.length === 0) return 'Device identifier'
  if (parts.length === 1) return parts[0]
  return parts.join(' / ')
}

export function isSupplierDuplicateError(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false
  const lower = stripSupplierHtml(raw).toLowerCase()
  return lower.includes('duplicate')
}

export function formatDuplicateWarning(
  duplicate: ActiveDeviceDuplicate,
  deviceLabel: string,
): string {
  const ref = duplicate.referenceId ? ` (upstream ref ${duplicate.referenceId})` : ''

  if (duplicate.status === 'SUCCESS') {
    return `${deviceLabel} was already completed successfully on order ${duplicate.orderCode} — ${duplicate.serviceTitle}${ref}. Re-ordering may be rejected by the supplier and your balance will be charged temporarily.`
  }

  return `${deviceLabel} is still being processed on order ${duplicate.orderCode} — ${duplicate.serviceTitle}${ref}.`
}
