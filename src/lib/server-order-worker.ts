/**
 * Submit server orders to Dhru Fusion supplier & poll status updates.
 */
import { prisma } from '@/lib/db'
import { decryptImeiApiKey } from '@/lib/crypto/imei-api-secret'
import { DhruFusionClient } from '@/lib/dhru-fusion'
import {
  formatSupplierRejectReason,
  mapDhruStatusToOrderStatus,
} from '@/lib/imei-order-worker'
import { normalizeSupplierCode, stripSupplierHtml } from '@/lib/imei-public'
import { normalizeFieldKey } from '@/lib/server-fields'
import { logSystemEvent } from '@/lib/activity-log'
import {
  extractServerStressEmail,
  isServerStressCredit,
  isServerStressTimeout,
} from '@/lib/server-stress-mock'
import { isStressTestMode } from '@/lib/stress-mode'
import type { Prisma, ServerOrder, ServerOrderStatus } from '@prisma/client'

function extractSupplierCode(remote: { code?: string; comments?: string }): string | null {
  return (
    normalizeSupplierCode(remote.code) ||
    normalizeSupplierCode(stripSupplierHtml(remote.comments || ''))
  )
}

/** Map preset / custom keys to Dhru CUSTOMFIELD JSON keys. */
const DHRU_SERVER_FIELD_KEYS: Record<string, string> = {
  sn: 'SN',
  email: 'EMAIL',
  username: 'USERNAME',
  password: 'PASSWORD',
  id: 'ID',
  licensekey: 'LICENSEKEY',
  license: 'LICENSEKEY',
  comments: 'COMMENTS',
  notes: 'COMMENTS',
  catatan: 'COMMENTS',
}

export function buildDhruServerFields(requiredFieldsJson: string | null): {
  fields: Record<string, string>
  nativeFields: Record<string, string>
  quantity?: string
} {
  const fields: Record<string, string> = {}
  const nativeFields: Record<string, string> = {}
  let quantity: string | undefined

  if (!requiredFieldsJson?.trim()) return { fields, nativeFields }

  try {
    const parsed = JSON.parse(requiredFieldsJson) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { fields, nativeFields }
    }

    for (const [key, raw] of Object.entries(parsed)) {
      const value = String(raw ?? '').trim()
      if (!value) continue

      const nk = normalizeFieldKey(key)
      if (nk === 'qnt' || nk === 'quantity' || nk === 'qty') {
        quantity = value
        continue
      }

      nativeFields[key.trim()] = value

      const dhruKey = DHRU_SERVER_FIELD_KEYS[nk] ?? key.trim().toUpperCase().replace(/\s+/g, '_')
      if (dhruKey) fields[dhruKey] = value
    }
  } catch {
    return { fields, nativeFields }
  }

  return { fields, nativeFields, quantity }
}

async function refundServerOrder(
  tx: Prisma.TransactionClient,
  order: Pick<ServerOrder, 'id' | 'orderCode' | 'userId' | 'price'>,
  reason: string,
  supplierCode?: string | null,
) {
  const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } })
  if (!wallet) return

  const newBalance = wallet.balance.add(order.price)
  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  })
  await tx.walletLedger.create({
    data: {
      walletId: wallet.id,
      type: 'REFUND',
      amount: order.price,
      balance: newBalance,
      description: `Refund order server #${order.orderCode}`,
      referenceId: order.id,
    },
  })

  await tx.serverOrder.update({
    where: { id: order.id },
    data: {
      status: 'REJECTED',
      comments: reason,
      code: supplierCode ?? undefined,
      completedAt: new Date(),
    },
  })
}

type OrderWithService = Prisma.ServerOrderGetPayload<{
  include: {
    service: { include: { api: true } }
  }
}>

function getDhruClient(order: OrderWithService): DhruFusionClient | null {
  const api = order.service.api
  if (!api || api.status !== 'ACTIVE' || api.apiType !== 'DhruFusion') return null
  return new DhruFusionClient({
    host: api.host,
    username: api.username,
    apiKey: decryptImeiApiKey(api.apiKey),
  })
}

/** Send a PENDING server order to the supplier API. */
export async function submitServerOrderToSupplier(orderId: string): Promise<{
  ok: boolean
  error?: string
  referenceId?: string
}> {
  const order = await prisma.serverOrder.findUnique({
    where: { id: orderId },
    include: { service: { include: { api: true } } },
  })

  if (!order) return { ok: false, error: 'Order not found' }
  if (order.referenceId) return { ok: true, referenceId: order.referenceId }
  if (order.status !== 'PENDING' && order.status !== 'IN_PROCESS') {
    return { ok: false, error: `Status order: ${order.status}` }
  }

  const toolId = order.service.toolId
  if (!toolId) {
    if (isStressTestMode()) {
      const email = extractServerStressEmail(order.requiredFields)
      if (isServerStressCredit(email)) {
        const raw = 'CreditprocessError: INSUFFICIENT_CREDIT on reseller account'
        const userMsg = formatSupplierRejectReason(raw, 'submit')
        await prisma.$transaction(async (tx) => {
          await refundServerOrder(tx, order, userMsg, normalizeSupplierCode(stripSupplierHtml(raw)))
        })
        return { ok: false, error: raw }
      }
      if (isServerStressTimeout(email)) {
        const raw = 'Request timeout while contacting supplier'
        const userMsg = formatSupplierRejectReason(raw, 'submit')
        await prisma.$transaction(async (tx) => {
          await refundServerOrder(tx, order, userMsg)
        })
        return { ok: false, error: raw }
      }
      const refId = `stress-server-${orderId}`
      await prisma.serverOrder.update({
        where: { id: orderId },
        data: {
          referenceId: refId,
          status: 'IN_PROCESS',
          processedAt: new Date(),
        },
      })
      return { ok: true, referenceId: refId }
    }
    await prisma.$transaction(async (tx) => {
      await refundServerOrder(tx, order, 'Service is not linked to supplier (missing toolId).')
    })
    return { ok: false, error: 'toolId is empty' }
  }

  const client = getDhruClient(order)
  if (!client) {
    await prisma.serverOrder.update({
      where: { id: orderId },
      data: {
        comments:
          'Supplier API is inactive or not DhruFusion — requires manual processing by admin.',
      },
    })
    return { ok: false, error: 'Supplier API unavailable' }
  }

  const { fields, nativeFields, quantity } = buildDhruServerFields(order.requiredFields)
  const qnt =
    quantity ??
    (order.service.quantity > 0 ? String(order.service.quantity) : undefined)

  const placed = await client.placeServerOrder(toolId, fields, {
    quantity: qnt,
    alternateFields: nativeFields,
  })

  if (!placed.success || !placed.referenceId) {
    const raw = placed.error || 'Failed to submit to supplier'
    const userMsg = formatSupplierRejectReason(raw, 'submit')
    await prisma.$transaction(async (tx) => {
      await refundServerOrder(tx, order, userMsg, normalizeSupplierCode(stripSupplierHtml(raw)))
    })
    return { ok: false, error: raw }
  }

  const refId = placed.referenceId
  const collision = await prisma.serverOrder.findFirst({
    where: {
      referenceId: refId,
      id: { not: orderId },
      service: { apiId: order.service.apiId },
    },
    include: { service: { select: { title: true } } },
  })

  if (collision && collision.serviceId !== order.serviceId) {
    const msg = `[Duplicate supplier reference] This server order conflicts with #${collision.orderCode} (${collision.service.title}, ref ${refId}).`
    await prisma.$transaction(async (tx) => {
      await refundServerOrder(tx, order, msg)
    })
    return { ok: false, error: 'Duplicate supplier reference' }
  }

  await prisma.serverOrder.update({
    where: { id: orderId },
    data: {
      referenceId: refId,
      status: 'IN_PROCESS',
      processedAt: new Date(),
      comments: null,
    },
  })

  return { ok: true, referenceId: refId }
}

/** Poll supplier for server order result and update DB. */
export async function pollServerOrderFromSupplier(orderId: string): Promise<{
  ok: boolean
  updated: boolean
  error?: string
}> {
  const order = await prisma.serverOrder.findUnique({
    where: { id: orderId },
    include: { service: { include: { api: true } } },
  })

  if (!order) return { ok: false, updated: false, error: 'Order not found' }
  if (!order.referenceId) {
    if (order.status === 'PENDING') {
      return submitServerOrderToSupplier(orderId).then((r) => ({
        ok: r.ok,
        updated: r.ok,
        error: r.error,
      }))
    }
    return { ok: false, updated: false, error: 'No supplier referenceId yet' }
  }

  const isFinal =
    order.status === 'SUCCESS' || order.status === 'REJECTED' || order.status === 'CANCELLED'
  if (isFinal && order.code) {
    return { ok: true, updated: false }
  }

  const client = getDhruClient(order)
  if (!client) return { ok: false, updated: false, error: 'Supplier API unavailable' }

  const remote = await client.getServerOrderStatus(order.referenceId)
  if (!remote.success) {
    return { ok: false, updated: false, error: remote.error }
  }

  const supplierCode = extractSupplierCode(remote)
  const mapped = mapDhruStatusToOrderStatus(remote.status ?? 0) as ServerOrderStatus | null

  if (isFinal) {
    if (supplierCode && supplierCode !== order.code) {
      await prisma.serverOrder.update({
        where: { id: orderId },
        data: { code: supplierCode },
      })
      return { ok: true, updated: true }
    }
    return { ok: true, updated: false }
  }

  if (!mapped || mapped === order.status) {
    if (supplierCode && supplierCode !== order.code) {
      await prisma.serverOrder.update({
        where: { id: orderId },
        data: { code: supplierCode },
      })
      return { ok: true, updated: true }
    }
    if (mapped === 'IN_PROCESS' && order.status === 'PENDING') {
      await prisma.serverOrder.update({
        where: { id: orderId },
        data: {
          status: 'IN_PROCESS',
          processedAt: order.processedAt ?? new Date(),
          code: supplierCode ?? order.code,
        },
      })
      return { ok: true, updated: true }
    }
    return { ok: true, updated: false }
  }

  if (mapped === 'SUCCESS') {
    await prisma.serverOrder.update({
      where: { id: orderId },
      data: {
        status: 'SUCCESS',
        code: supplierCode,
        comments: null,
        completedAt: new Date(),
      },
    })
    void logSystemEvent({
      action: 'order.server.success',
      severity: 'SUCCESS',
      summary: `Server order ${order.orderCode} completed`,
      target: { type: 'server_order', id: order.id, label: order.orderCode },
      metadata: { orderCode: order.orderCode, code: supplierCode ?? null },
    })
    return { ok: true, updated: true }
  }

  if (mapped === 'REJECTED') {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.serverOrder.findUnique({ where: { id: orderId } })
      if (!fresh) return
      const wasFinal =
        fresh.status === 'SUCCESS' || fresh.status === 'REJECTED' || fresh.status === 'CANCELLED'
      if (wasFinal) return

      const rejectCode =
        supplierCode ||
        normalizeSupplierCode(stripSupplierHtml(remote.error || 'Rejected by supplier'))

      await tx.serverOrder.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          code: rejectCode,
          comments: formatSupplierRejectReason(
            stripSupplierHtml(remote.comments || remote.error || 'Rejected by supplier'),
            'poll',
          ),
          completedAt: new Date(),
        },
      })

      const wallet = await tx.wallet.findUnique({ where: { userId: fresh.userId } })
      if (wallet) {
        const newBalance = wallet.balance.add(fresh.price)
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } })
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: fresh.price,
            balance: newBalance,
            description: `Refund order server #${fresh.orderCode}`,
            referenceId: fresh.id,
          },
        })
      }
    })
    void logSystemEvent({
      action: 'order.server.rejected',
      severity: 'WARNING',
      summary: `Server order ${order.orderCode} rejected by supplier`,
      detail: remote.error ?? null,
      target: { type: 'server_order', id: order.id, label: order.orderCode },
      metadata: { orderCode: order.orderCode, supplierError: remote.error ?? null },
    })
    return { ok: true, updated: true }
  }

  await prisma.serverOrder.update({
    where: { id: orderId },
    data: {
      status: mapped,
      processedAt: order.processedAt ?? new Date(),
    },
  })
  return { ok: true, updated: true }
}

/** Batch: submit pending server orders & poll in-flight orders (for scheduler/cron). */
export async function processServerOrderQueue(options?: { submitLimit?: number; pollLimit?: number }) {
  const submitLimit = options?.submitLimit ?? 20
  const pollLimit = options?.pollLimit ?? 50

  const toSubmit = await prisma.serverOrder.findMany({
    where: { status: 'PENDING', referenceId: null },
    orderBy: { createdAt: 'asc' },
    take: submitLimit,
    select: { id: true },
  })

  const submitResults = []
  for (const { id } of toSubmit) {
    submitResults.push({ id, ...(await submitServerOrderToSupplier(id)) })
  }

  const toPoll = await prisma.serverOrder.findMany({
    where: {
      referenceId: { not: null },
      OR: [
        { status: { in: ['PENDING', 'IN_PROCESS'] } },
        {
          status: { in: ['SUCCESS', 'REJECTED'] },
          OR: [{ code: null }, { code: '' }],
        },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: pollLimit,
    select: { id: true },
  })

  const pollResults = []
  for (const { id } of toPoll) {
    pollResults.push({ id, ...(await pollServerOrderFromSupplier(id)) })
  }

  return {
    submitted: submitResults.length,
    polled: pollResults.length,
    submitResults,
    pollResults,
  }
}
