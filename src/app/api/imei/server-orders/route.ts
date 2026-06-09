import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth'
import { normalizeSupplierCode } from '@/lib/imei-public'
import { scheduleServerOrderFollowUp } from '@/lib/server-order-scheduler'
import {
  pollServerOrderFromSupplier,
  submitServerOrderToSupplier,
} from '@/lib/server-order-worker'
import { parseServerFieldDefs, validateServerOrderFields } from '@/lib/server-fields'
import {
  findActiveServerOrderDuplicate,
  formatServerDuplicateWarning,
  serializeServerOrderFields,
} from '@/lib/server-order-duplicate'
import { createServerOrderSchema } from '@/lib/validations/server'
import { extractRequestContext, logOrderEvent } from '@/lib/activity-log'
import { notifyTelegramOrderCreated, notifyTelegramAdminNewOrder } from '@/lib/telegram/notify'
import { generateOrderCode } from '@/lib/generate-order-code'
import { ServerOrderStatus, type Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/imei/server-orders — user's server orders */
export async function GET(req: Request) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()

    const where: Prisma.ServerOrderWhereInput = { userId: session.user.id }
    if (status && (Object.values(ServerOrderStatus) as string[]).includes(status)) {
      where.status = status as ServerOrderStatus
    }
    if (q) {
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { service: { title: { contains: q, mode: 'insensitive' } } },
      ]
    }

    let orders = await prisma.serverOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            requiredFields: true,
            box: { select: { title: true } },
          },
        },
      },
    })

    const missingSupplierCode = orders.filter(
      (o) =>
        o.referenceId &&
        !normalizeSupplierCode(o.code) &&
        (o.status === 'SUCCESS' || o.status === 'REJECTED'),
    )
    if (missingSupplierCode.length > 0) {
      await Promise.all(
        missingSupplierCode.slice(0, 8).map((o) => pollServerOrderFromSupplier(o.id)),
      )
      const ids = missingSupplierCode.map((o) => o.id)
      const refreshed = await prisma.serverOrder.findMany({
        where: { id: { in: ids } },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              requiredFields: true,
              box: { select: { title: true } },
            },
          },
        },
      })
      const byId = new Map(refreshed.map((o) => [o.id, o]))
      orders = orders.map((o) => byId.get(o.id) ?? o)
    }

    return apiSuccess(orders)
  } catch (e) {
    console.error('[SERVER_ORDERS_GET]', e)
    return apiError('Failed to fetch orders', 500)
  }
}

/** POST /api/imei/server-orders — place a server order */
export async function POST(req: Request) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createServerOrderSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const userId = session.user.id
    const service = await prisma.serverService.findFirst({ where: { id: parsed.data.serviceId } })
    if (!service) return apiError('Service not found', 404)
    if (service.status !== 'ACTIVE') return apiError('Service is not active', 400)

    const fieldDefs = parseServerFieldDefs(service.requiredFields)
    const validation = validateServerOrderFields(fieldDefs, parsed.data.requiredFields)
    if (!validation.ok) return apiError(validation.error ?? 'Invalid order data', 400)

    const requiredFieldsJson = serializeServerOrderFields(validation.fields)
    const duplicate = await findActiveServerOrderDuplicate({
      userId,
      serviceId: service.id,
      requiredFieldsJson,
    })
    if (duplicate && !parsed.data.acknowledgeDuplicate) {
      return apiError(formatServerDuplicateWarning(duplicate), 409, {
        code: 'DUPLICATE_ORDER',
        duplicate,
      })
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) return apiError('Wallet not found', 400)

    // Tiered pricing — see /api/imei/orders for the rationale.
    const { resolveServicePriceForUser } = await import('@/lib/pricing')
    const resolved = await resolveServicePriceForUser({
      userId,
      serviceId: service.id,
      kind: 'server',
      basePrice: service.price,
    })
    const effectivePrice = resolved.price as typeof service.price

    if (wallet.balance.lessThan(effectivePrice)) return apiError('Insufficient balance', 402)

    const order = await prisma.$transaction(async (tx) => {
      // Re-read wallet inside transaction to prevent race condition
      const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
      if (freshWallet.balance.lessThan(effectivePrice)) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const newBalance = freshWallet.balance.sub(effectivePrice)
      await tx.wallet.update({ where: { id: freshWallet.id }, data: { balance: newBalance } })

      const created = await tx.serverOrder.create({
        data: {
          orderCode: generateOrderCode(),
          userId,
          serviceId: service.id,
          price: effectivePrice,
          status: 'PENDING',
          email: validation.email,
          notes: validation.notes,
          requiredFields: requiredFieldsJson || null,
        },
        include: { service: { select: { id: true, title: true } } },
      })

      await tx.walletLedger.create({
        data: {
          walletId: freshWallet.id,
          type: 'PAYMENT',
          amount: effectivePrice.neg(),
          balance: newBalance,
          description:
            resolved.source === 'retail'
              ? `Server order: ${service.title}`
              : `Server order: ${service.title} (tier: ${resolved.groupName ?? '-'})`,
          referenceId: created.id,
        },
      })
      return created
    })

    try {
      const submitted = await submitServerOrderToSupplier(order.id)
      if (submitted.ok && submitted.referenceId) {
        void pollServerOrderFromSupplier(order.id).catch((e) =>
          console.error('[SERVER_ORDERS_POLL_AFTER_SUBMIT]', e),
        )
      }
      scheduleServerOrderFollowUp(order.id)
    } catch (submitErr) {
      console.error('[SERVER_ORDERS_SUBMIT_SUPPLIER]', submitErr)
    }

    const ctx = extractRequestContext(req)
    void logOrderEvent({
      action: 'order.server.created',
      severity: 'SUCCESS',
      summary: `Order Server baru: ${order.orderCode} — ${service.title}`,
      actor: {
        id: userId,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      target: { type: 'server_order', id: order.id, label: order.orderCode },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: {
        orderCode: order.orderCode,
        serviceTitle: service.title,
        amount: service.price.toString(),
      },
    })

    // Fire-and-forget Telegram notifications
    void notifyTelegramOrderCreated({
      userId,
      orderCode: order.orderCode,
      serviceName: service.title,
      price: order.price.toString(),
    })
    void notifyTelegramAdminNewOrder({
      orderCode: order.orderCode,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      serviceName: service.title,
      price: order.price.toString(),
    })
    void import('@/lib/email/notify').then(({ notifyOrderCreated, notifyAdminNewOrder }) => {
      notifyOrderCreated({ kind: 'server', orderId: order.id })
      notifyAdminNewOrder({
        orderCode: order.orderCode,
        userName: session.user.name ?? session.user.email ?? 'Unknown',
        serviceName: service.title,
        price: order.price.toString(),
        kind: 'server',
      })
    })

    const refreshed = await prisma.serverOrder.findUnique({
      where: { id: order.id },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            requiredFields: true,
            box: { select: { title: true } },
          },
        },
      },
    })

    return apiSuccess(refreshed ?? order, 201)
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return apiError('Insufficient balance', 402)
    }
    console.error('[SERVER_ORDERS_POST]', e)
    return apiError('Failed to create order', 500)
  }
}
