/**
 * Submit IMEI orders to Dhru Fusion supplier & poll status updates.
 */
import { prisma } from '@/lib/db'
import { decryptImeiApiKey } from '@/lib/crypto/imei-api-secret'
import { DhruFusionClient } from '@/lib/dhru-fusion'
import { normalizeSupplierCode, stripSupplierHtml } from '@/lib/imei-public'
import { logSystemEvent } from '@/lib/activity-log'
import {
  isImeiStressCredit,
  isImeiStressTimeout,
} from '@/lib/imei-stress-mock'
import {
  getOrderSubmitWindowMs,
  isOrderSubmitWindowExpired,
  STALE_SUBMIT_REJECT_MESSAGE,
} from '@/lib/order-submit-policy'
import { isStressTestMode } from '@/lib/stress-mode'
import { assertOrderPaidBeforeSupplierSubmit } from '@/lib/marketplace-order-guard'
import { isManualSource, MANUAL_REVIEW_COMMENT } from '@/lib/service-source'
import type { ImeiOrder, ImeiOrderStatus, Prisma } from '@prisma/client'

function extractSupplierCode(remote: { code?: string; comments?: string }): string | null {
  return (
    normalizeSupplierCode(remote.code) ||
    normalizeSupplierCode(stripSupplierHtml(remote.comments || ''))
  )
}

/**
 * Map supplier errors to clear user/admin messages.
 * @param phase submit = placeimeiorder failed (instant, no referenceId);
 *              poll = getimeiorder rejected after queue.
 */
export function formatSupplierRejectReason(raw: string, phase: 'submit' | 'poll'): string {
  const clean = stripSupplierHtml(raw)
  const lower = clean.toLowerCase()
  const prefix =
    phase === 'submit'
      ? '[Rejected on submit — order did not enter supplier queue]'
      : '[Rejected after supplier processing]'

  if (lower.includes('creditprocess') || lower.includes('credit process')) {
    return phase === 'submit'
      ? '[Rejected on submit] Insufficient reseller API balance/credit at the supplier (CreditprocessError). Top up at the supplier panel — this is not the user wallet balance on this platform.'
      : `[Rejected after supplier processing] ${clean}`
  }

  if (lower.includes('invalid imei') || lower.includes('validationerror')) {
    return `[Rejected on submit] Invalid IMEI according to supplier. Use a valid 15-digit number (dial *#06# on device). ${clean}`
  }

  if (lower.includes('imei') && lower.includes('required')) {
    return phase === 'submit'
      ? `[Rejected on submit] Supplier rejected the order format (IMEI required). Check service fields (username/qty) and minimum quantity on the supplier panel. ${clean}`
      : `${prefix} ${clean}`
  }

  if (lower.includes('duplicate')) {
    return phase === 'submit'
      ? `[Rejected by supplier — duplicate order] ${clean} This device was already submitted for the same service (still active or recently processed). Check the previous order on the supplier panel before ordering again.`
      : `[Rejected by supplier — duplicate order] ${clean}`
  }

  return `${prefix} ${clean}`
}

/** Dhru Classic getimeiorder STATUS: 0=New, 1=InProcess, 3=Reject, 4=Success */
export function mapDhruStatusToOrderStatus(dhruStatus: number): ImeiOrderStatus | null {
  switch (dhruStatus) {
    case 4:
      return 'SUCCESS'
    case 3:
      return 'REJECTED'
    case 1:
      return 'IN_PROCESS'
    case 0:
      return 'IN_PROCESS'
    default:
      return null
  }
}

export function buildDhruOrderFields(order: Pick<
  ImeiOrder,
  | 'imei'
  | 'network'
  | 'model'
  | 'provider'
  | 'pin'
  | 'kbh'
  | 'mep'
  | 'prd'
  | 'serialNumber'
  | 'ecid'
>): Record<string, string> {
  const fields: Record<string, string> = { IMEI: order.imei }
  if (order.network?.trim()) fields.NETWORK = order.network.trim()
  if (order.model?.trim()) fields.MODEL = order.model.trim()
  if (order.provider?.trim()) fields.PROVIDER = order.provider.trim()
  if (order.pin?.trim()) fields.PIN = order.pin.trim()
  if (order.kbh?.trim()) fields.KBH = order.kbh.trim()
  if (order.mep?.trim()) fields.MEP = order.mep.trim()
  if (order.prd?.trim()) fields.PRD = order.prd.trim()
  if (order.serialNumber?.trim()) fields.SN = order.serialNumber.trim()
  if (order.ecid?.trim()) fields.ECID = order.ecid.trim()
  return fields
}

async function refundImeiOrder(
  tx: Prisma.TransactionClient,
  order: Pick<ImeiOrder, 'id' | 'orderCode' | 'userId' | 'price'>,
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
      description: `Refund IMEI order #${order.orderCode}`,
      referenceId: order.id,
    },
  })

  await tx.imeiOrder.update({
    where: { id: order.id },
    data: {
      status: 'REJECTED',
      comments: reason,
      code: supplierCode ?? undefined,
      completedAt: new Date(),
    },
  })
}

type OrderWithService = Prisma.ImeiOrderGetPayload<{
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

async function claimImeiOrderForSupplierSubmit(
  orderId: string,
): Promise<OrderWithService | null> {
  const claimed = await prisma.imeiOrder.updateMany({
    where: {
      id: orderId,
      status: 'PENDING',
      referenceId: null,
      processedAt: null,
    },
    data: { processedAt: new Date() },
  })

  if (claimed.count === 0) return null

  return prisma.imeiOrder.findUnique({
    where: { id: orderId },
    include: { service: { include: { api: true } } },
  })
}

async function rejectExpiredPendingImeiOrder(
  order: Pick<ImeiOrder, 'id' | 'orderCode' | 'userId' | 'price' | 'createdAt' | 'status' | 'referenceId'>,
): Promise<boolean> {
  if (order.status !== 'PENDING' || order.referenceId) return false
  if (!isOrderSubmitWindowExpired(order.createdAt)) return false

  await prisma.$transaction(async (tx) => {
    await refundImeiOrder(tx, order, STALE_SUBMIT_REJECT_MESSAGE)
  })
  return true
}

/** Send a PENDING order to the supplier API (at most once per order). */
export async function submitImeiOrderToSupplier(orderId: string): Promise<{
  ok: boolean
  error?: string
  referenceId?: string
}> {
  const snapshot = await prisma.imeiOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderCode: true,
      userId: true,
      price: true,
      createdAt: true,
      referenceId: true,
      status: true,
      processedAt: true,
    },
  })

  if (!snapshot) return { ok: false, error: 'Order not found' }
  if (snapshot.referenceId) return { ok: true, referenceId: snapshot.referenceId }
  if (snapshot.status === 'REJECTED' || snapshot.status === 'CANCELLED' || snapshot.status === 'SUCCESS') {
    return { ok: false, error: `Order status: ${snapshot.status}` }
  }
  if (snapshot.status !== 'PENDING') {
    return { ok: false, error: `Order status: ${snapshot.status}` }
  }

  if (await rejectExpiredPendingImeiOrder(snapshot)) {
    return { ok: false, error: STALE_SUBMIT_REJECT_MESSAGE }
  }

  const paid = await assertOrderPaidBeforeSupplierSubmit(orderId, 'imei')
  if (!paid.ok) {
    return { ok: false, error: paid.error }
  }

  if (snapshot.processedAt) {
    return { ok: false, error: 'Submit already attempted for this order' }
  }

  const order = await claimImeiOrderForSupplierSubmit(orderId)
  if (!order) {
    const again = await prisma.imeiOrder.findUnique({
      where: { id: orderId },
      select: { referenceId: true },
    })
    if (again?.referenceId) return { ok: true, referenceId: again.referenceId }
    return { ok: false, error: 'Submit already in progress or completed' }
  }

  if (isManualSource(order.service.sourceType)) {
    await prisma.imeiOrder.update({
      where: { id: orderId },
      data: {
        comments: MANUAL_REVIEW_COMMENT,
        processedAt: order.processedAt ?? new Date(),
      },
    })
    return { ok: false, error: 'manual_review_required' }
  }

  const toolId = order.service.toolId
  if (!toolId) {
    if (isStressTestMode()) {
      if (isImeiStressCredit(order.imei)) {
        const raw = 'CreditprocessError: INSUFFICIENT_CREDIT on reseller account'
        const userMsg = formatSupplierRejectReason(raw, 'submit')
        await prisma.$transaction(async (tx) => {
          await refundImeiOrder(tx, order, userMsg, normalizeSupplierCode(stripSupplierHtml(raw)))
        })
        return { ok: false, error: raw }
      }
      if (isImeiStressTimeout(order.imei)) {
        const raw = 'Request timeout while contacting supplier'
        const userMsg = formatSupplierRejectReason(raw, 'submit')
        await prisma.$transaction(async (tx) => {
          await refundImeiOrder(tx, order, userMsg)
        })
        return { ok: false, error: raw }
      }
      const refId = `stress-local-${orderId}`
      await prisma.imeiOrder.update({
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
      await refundImeiOrder(tx, order, 'Service is not linked to supplier (missing toolId).')
    })
    return { ok: false, error: 'toolId is empty' }
  }

  const client = getDhruClient(order)
  if (!client) {
    await prisma.$transaction(async (tx) => {
      await refundImeiOrder(
        tx,
        order,
        'Supplier API is inactive or not DhruFusion — requires manual processing by admin.',
      )
    })
    return { ok: false, error: 'Supplier API unavailable' }
  }

  const fields = buildDhruOrderFields(order)
  const placed = await client.placeImeiOrderFields(toolId, fields)

  if (!placed.success || !placed.referenceId) {
    const raw = placed.error || 'Failed to submit to supplier'
    const userMsg = formatSupplierRejectReason(raw, 'submit')
    await prisma.$transaction(async (tx) => {
      await refundImeiOrder(tx, order, userMsg, normalizeSupplierCode(stripSupplierHtml(raw)))
    })
    return { ok: false, error: raw }
  }

  const refId = placed.referenceId
  const collision = await prisma.imeiOrder.findFirst({
    where: {
      referenceId: refId,
      id: { not: orderId },
      service: { apiId: order.service.apiId },
    },
    include: { service: { select: { title: true, toolId: true } } },
  })

  if (collision && collision.serviceId !== order.serviceId) {
    const msg = `[Duplicate supplier reference] This device is already registered as order #${collision.orderCode} (${collision.service.title}, ref ${refId}). Cancel or wait for completion on the supplier panel, then order again.`
    await prisma.$transaction(async (tx) => {
      await refundImeiOrder(tx, order, msg)
    })
    return { ok: false, error: 'Device still active for another service at supplier' }
  }

  await prisma.imeiOrder.update({
    where: { id: orderId },
    data: {
      referenceId: refId,
      status: 'IN_PROCESS',
      comments: null,
    },
  })

  return { ok: true, referenceId: refId }
}

/** Poll supplier for order result and update DB. */
export async function pollImeiOrderFromSupplier(orderId: string): Promise<{
  ok: boolean
  updated: boolean
  error?: string
}> {
  const order = await prisma.imeiOrder.findUnique({
    where: { id: orderId },
    include: { service: { include: { api: true } } },
  })

  if (!order) return { ok: false, updated: false, error: 'Order not found' }
  if (!order.referenceId) {
    if (order.status === 'PENDING' && !order.processedAt) {
      return submitImeiOrderToSupplier(orderId).then((r) => ({
        ok: r.ok,
        updated: r.ok || r.error === STALE_SUBMIT_REJECT_MESSAGE,
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

  const remote = await client.getOrderStatus(order.referenceId)
  if (!remote.success) {
    return { ok: false, updated: false, error: remote.error }
  }

  const supplierCode = extractSupplierCode(remote)
  const mapped = mapDhruStatusToOrderStatus(remote.status ?? 0)

  if (isFinal) {
    if (supplierCode && supplierCode !== order.code) {
      await prisma.imeiOrder.update({
        where: { id: orderId },
        data: { code: supplierCode },
      })
      return { ok: true, updated: true }
    }
    return { ok: true, updated: false }
  }

  if (!mapped || mapped === order.status) {
    if (supplierCode && supplierCode !== order.code) {
      await prisma.imeiOrder.update({
        where: { id: orderId },
        data: { code: supplierCode },
      })
      return { ok: true, updated: true }
    }
    if (mapped === 'IN_PROCESS' && order.status === 'PENDING') {
      await prisma.imeiOrder.update({
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
    await prisma.imeiOrder.update({
      where: { id: orderId },
      data: {
        status: 'SUCCESS',
        code: supplierCode,
        comments: null,
        completedAt: new Date(),
      },
    })
    void logSystemEvent({
      action: 'order.imei.success',
      severity: 'SUCCESS',
      summary: `IMEI order ${order.orderCode} completed`,
      target: { type: 'imei_order', id: order.id, label: order.orderCode },
      metadata: { orderCode: order.orderCode, code: supplierCode ?? null },
    })
    return { ok: true, updated: true }
  }

  if (mapped === 'REJECTED') {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.imeiOrder.findUnique({ where: { id: orderId } })
      if (!fresh) return
      const wasFinal =
        fresh.status === 'SUCCESS' || fresh.status === 'REJECTED' || fresh.status === 'CANCELLED'
      if (wasFinal) return

      const supplierReply =
        stripSupplierHtml(remote.comments || '') ||
        stripSupplierHtml(remote.code || '') ||
        stripSupplierHtml(remote.error || '') ||
        'Rejected by supplier'
      const rejectCode =
        supplierCode || normalizeSupplierCode(supplierReply)
      const rejectComments = formatSupplierRejectReason(supplierReply, 'poll')

      await tx.imeiOrder.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          code: rejectCode,
          comments: rejectComments,
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
            description: `Refund IMEI order #${fresh.orderCode}`,
            referenceId: fresh.id,
          },
        })
      }
    })
    void logSystemEvent({
      action: 'order.imei.rejected',
      severity: 'WARNING',
      summary: `IMEI order ${order.orderCode} rejected by supplier`,
      detail: remote.error ?? null,
      target: { type: 'imei_order', id: order.id, label: order.orderCode },
      metadata: { orderCode: order.orderCode, supplierError: remote.error ?? null },
    })
    return { ok: true, updated: true }
  }

  await prisma.imeiOrder.update({
    where: { id: orderId },
    data: {
      status: mapped,
      processedAt: order.processedAt ?? new Date(),
    },
  })
  return { ok: true, updated: true }
}

/** Reject PENDING backlog that never reached supplier within the submit window. */
async function rejectStalePendingImeiOrders(limit = 50): Promise<number> {
  const cutoff = new Date(Date.now() - getOrderSubmitWindowMs())
  const stale = await prisma.imeiOrder.findMany({
    where: {
      status: 'PENDING',
      referenceId: null,
      processedAt: null,
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      orderCode: true,
      userId: true,
      price: true,
      createdAt: true,
      status: true,
      referenceId: true,
    },
  })

  let rejected = 0
  for (const row of stale) {
    if (await rejectExpiredPendingImeiOrder(row)) rejected += 1
  }
  return rejected
}

/** Batch: submit pending orders & poll in-flight orders (for cron). */
export async function processImeiOrderQueue(options?: { submitLimit?: number; pollLimit?: number }) {
  const submitLimit = options?.submitLimit ?? 20
  const pollLimit = options?.pollLimit ?? 50

  await rejectStalePendingImeiOrders(submitLimit)

  const toSubmit = await prisma.imeiOrder.findMany({
    where: { status: 'PENDING', referenceId: null, processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: submitLimit,
    select: { id: true },
  })

  const submitResults = []
  for (const { id } of toSubmit) {
    submitResults.push({ id, ...(await submitImeiOrderToSupplier(id)) })
  }

  const toPoll = await prisma.imeiOrder.findMany({
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
    pollResults.push({ id, ...(await pollImeiOrderFromSupplier(id)) })
  }

  return {
    submitted: submitResults.length,
    polled: pollResults.length,
    submitResults,
    pollResults,
  }
}
