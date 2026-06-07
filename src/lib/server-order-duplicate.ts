import { prisma } from '@/lib/db'

export type ActiveServerOrderDuplicate = {
  id: string
  orderCode: string
  status: string
  referenceId: string | null
  createdAt: Date
  serviceTitle: string
}

/** Canonical JSON for comparing submitted server order fields. */
export function canonicalizeServerOrderFields(requiredFieldsJson: string | null): string {
  if (!requiredFieldsJson?.trim()) return ''
  try {
    const parsed = JSON.parse(requiredFieldsJson) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ''
    const sorted: Record<string, string> = {}
    for (const key of Object.keys(parsed).sort()) {
      const v = parsed[key]
      if (v == null) continue
      const s = String(v).trim()
      if (s) sorted[key] = s
    }
    return JSON.stringify(sorted)
  } catch {
    return requiredFieldsJson.trim()
  }
}

export function serializeServerOrderFields(fields: Record<string, string>): string {
  return canonicalizeServerOrderFields(JSON.stringify(fields))
}

/**
 * Block a second active order for the same user + service + field payload.
 * Prevents duplicate supplier submissions when users retry after transient failures.
 */
export async function findActiveServerOrderDuplicate(params: {
  userId: string
  serviceId: string
  requiredFieldsJson: string
  excludeOrderId?: string
}): Promise<ActiveServerOrderDuplicate | null> {
  const target = canonicalizeServerOrderFields(params.requiredFieldsJson)
  if (!target) return null

  const candidates = await prisma.serverOrder.findMany({
    where: {
      userId: params.userId,
      serviceId: params.serviceId,
      status: { in: ['PENDING', 'IN_PROCESS'] },
      ...(params.excludeOrderId ? { id: { not: params.excludeOrderId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      orderCode: true,
      status: true,
      referenceId: true,
      createdAt: true,
      requiredFields: true,
      service: { select: { title: true } },
    },
  })

  const row = candidates.find(
    (c) => canonicalizeServerOrderFields(c.requiredFields) === target,
  )
  if (!row) return null

  return {
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    referenceId: row.referenceId,
    createdAt: row.createdAt,
    serviceTitle: row.service.title,
  }
}

export function formatServerDuplicateWarning(duplicate: ActiveServerOrderDuplicate): string {
  const ref = duplicate.referenceId ? ` (supplier ref ${duplicate.referenceId})` : ''
  return `An active order for the same service and credentials already exists: #${duplicate.orderCode}${ref}. Wait for it to complete or cancel before ordering again.`
}
