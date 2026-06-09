import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth'
import { scheduleImeiOrderFollowUp } from '@/lib/imei-order-scheduler'
import { normalizeSupplierCode } from '@/lib/imei-public'
import { pollImeiOrderFromSupplier, submitImeiOrderToSupplier } from '@/lib/imei-order-worker'
import { createImeiOrderSchema } from '@/lib/validations/imei'
import {
  deviceFieldLabel,
  findActiveDeviceDuplicate,
  formatDuplicateWarning,
} from '@/lib/imei-order-duplicate'
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input'
import { extractRequestContext, logOrderEvent } from '@/lib/activity-log'
import { notifyTelegramOrderCreated, notifyTelegramAdminNewOrder } from '@/lib/telegram/notify'
import { generateOrderCode } from '@/lib/generate-order-code'
import type { Prisma } from '@prisma/client'
import { requireRuntimeLicense } from '@/lib/license-guard'

export const dynamic = 'force-dynamic'

/** GET /api/imei/orders — list current user's orders */
export async function GET(req: Request) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')

    const where: Prisma.ImeiOrderWhereInput = { userId: session.user.id }
    if (status && ['PENDING', 'IN_PROCESS', 'SUCCESS', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status as Prisma.ImeiOrderWhereInput['status']
    }
    if (q && q.trim()) {
      where.OR = [
        { imei: { contains: q } },
        { orderCode: { contains: q, mode: 'insensitive' } },
        { service: { title: { contains: q, mode: 'insensitive' } } },
      ]
    }

    let orders = await prisma.imeiOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            group: { select: { id: true, title: true } },
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
        missingSupplierCode.slice(0, 8).map((o) => pollImeiOrderFromSupplier(o.id)),
      )
      const ids = missingSupplierCode.map((o) => o.id)
      const refreshed = await prisma.imeiOrder.findMany({
        where: { id: { in: ids } },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              group: { select: { id: true, title: true } },
            },
          },
        },
      })
      const byId = new Map(refreshed.map((o) => [o.id, o]))
      orders = orders.map((o) => byId.get(o.id) ?? o)
    }

    return apiSuccess(orders)
  } catch (e) {
    console.error('[IMEI_ORDERS_GET]', e)
    return apiError('Failed to fetch orders', 500)
  }
}

/**
 * POST /api/imei/orders — place a new IMEI order.
 * Deducts price from user wallet (debit) and creates order with PENDING status.
 */
export async function POST(req: Request) {
  const licenseDenied = await requireRuntimeLicense()
  if (licenseDenied) return licenseDenied

  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const rawBody = await req.json()
    const body = {
      ...rawBody,
      // Backward-compat for typo key from older clients.
      serialNumber: rawBody?.serialNumber ?? rawBody?.serialNubmer ?? null,
    }
    const parsed = createImeiOrderSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const userId = session.user.id

    // Verify service exists and is active
    const service = await prisma.imeiService.findFirst({
      where: { id: parsed.data.serviceId, status: 'ACTIVE' },
      select: {
        id: true,
        apiId: true,
        price: true,
        title: true,
        requiresImei: true,
        requiresNetwork: true,
        requiresModel: true,
        requiresProvider: true,
        requiresPin: true,
        requiresKbh: true,
        requiresMep: true,
        requiresPrd: true,
        requiresSn: true,
        requiresEcid: true,
      },
    })
    if (!service) return apiError('Service not found or inactive', 404)

    const deviceInput = validateImeiOrderDeviceInput(service, parsed.data)
    if (deviceInput.error) return apiError(deviceInput.error)

    const deviceLabel = deviceFieldLabel(service.requiresImei, service.requiresSn, service.requiresEcid)
    const duplicate = await findActiveDeviceDuplicate({
      apiId: service.apiId,
      serviceId: service.id,
      deviceKey: deviceInput.imei,
    })
    if (duplicate && !parsed.data.acknowledgeDuplicate) {
      return apiError(formatDuplicateWarning(duplicate, deviceLabel), 409, {
        code: 'DUPLICATE_ORDER',
        duplicate,
      })
    }

    // Validate required dynamic fields based on service requirements
    const required: { key: keyof typeof parsed.data; label: string; flag: boolean }[] = [
      { key: 'network', label: 'Network', flag: service.requiresNetwork },
      { key: 'model', label: 'Model', flag: service.requiresModel },
      { key: 'provider', label: 'Provider', flag: service.requiresProvider },
      { key: 'pin', label: 'PIN', flag: service.requiresPin },
      { key: 'kbh', label: 'KBH', flag: service.requiresKbh },
      { key: 'mep', label: 'MEP', flag: service.requiresMep },
      { key: 'prd', label: 'PRD', flag: service.requiresPrd },
      { key: 'serialNumber', label: 'Serial Number', flag: service.requiresSn },
      { key: 'ecid', label: 'ECID', flag: service.requiresEcid },
    ]
    for (const r of required) {
      if (r.flag && (!parsed.data[r.key] || `${parsed.data[r.key]}`.trim() === '')) {
        return apiError(`Field ${r.label} is required`)
      }
    }

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) return apiError('Wallet not found', 400)

    // Tiered pricing — resolved against the user's PriceGroup (if any).
    // Falls back to service.price when the user has no group, no override,
    // or any internal error. Never throws past the helper.
    const { resolveServicePriceForUser } = await import('@/lib/pricing')
    const resolved = await resolveServicePriceForUser({
      userId,
      serviceId: service.id,
      kind: 'imei',
      basePrice: service.price,
    })
    const effectivePrice = resolved.price as typeof service.price

    if (wallet.balance.lessThan(effectivePrice)) {
      return apiError('Insufficient balance. Please top up first.', 402)
    }

    // Create order + debit wallet in a transaction (re-read balance inside for atomicity)
    const order = await prisma.$transaction(async (tx) => {
      // Re-read wallet inside transaction to prevent race condition
      const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
      if (freshWallet.balance.lessThan(effectivePrice)) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const newBalance = freshWallet.balance.sub(effectivePrice)
      await tx.wallet.update({
        where: { id: freshWallet.id },
        data: { balance: newBalance },
      })

      const orderCode = generateOrderCode()
      const created = await tx.imeiOrder.create({
        data: {
          orderCode,
          userId,
          serviceId: service.id,
          imei: deviceInput.imei,
          price: effectivePrice,
          status: 'PENDING',
          network: parsed.data.network ?? null,
          model: parsed.data.model ?? null,
          provider: parsed.data.provider ?? null,
          pin: parsed.data.pin ?? null,
          kbh: parsed.data.kbh ?? null,
          mep: parsed.data.mep ?? null,
          prd: parsed.data.prd ?? null,
          serialNumber: deviceInput.serialNumber,
          ecid: deviceInput.ecid,
          note: parsed.data.note ?? null,
        },
        include: {
          service: { select: { id: true, title: true } },
        },
      })

      await tx.walletLedger.create({
        data: {
          walletId: freshWallet.id,
          type: 'PAYMENT',
          amount: effectivePrice.neg(),
          balance: newBalance,
          description:
            resolved.source === 'retail'
              ? `Order IMEI ${service.title}`
              : `Order IMEI ${service.title} (tier: ${resolved.groupName ?? '-'})`,
          referenceId: created.id,
        },
      })

      return created
    })

    // Langsung teruskan ke supplier Dhru, lalu jadwalkan cek status berkala
    try {
      const submitted = await submitImeiOrderToSupplier(order.id)
      if (submitted.ok && submitted.referenceId) {
        void pollImeiOrderFromSupplier(order.id).catch((e) =>
          console.error('[IMEI_ORDERS_POLL_AFTER_SUBMIT]', e),
        )
      }
      scheduleImeiOrderFollowUp(order.id)
    } catch (submitErr) {
      console.error('[IMEI_ORDERS_SUBMIT_SUPPLIER]', submitErr)
    }

    const refreshed = await prisma.imeiOrder.findUnique({
      where: { id: order.id },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            group: { select: { id: true, title: true } },
          },
        },
      },
    })

    const ctx = extractRequestContext(req)
    void logOrderEvent({
      action: 'order.imei.created',
      severity: 'SUCCESS',
      summary: `Order IMEI baru: ${order.orderCode} — ${service.title}`,
      actor: {
        id: userId,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role,
      },
      target: { type: 'imei_order', id: order.id, label: order.orderCode },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: {
        orderCode: order.orderCode,
        serviceTitle: service.title,
        amount: service.price.toString(),
        imei: deviceInput.imei,
        serialNumber: deviceInput.serialNumber,
      },
    })

    // Fire-and-forget Telegram notifications
    void notifyTelegramOrderCreated({
      userId,
      orderCode: order.orderCode,
      serviceName: service.title,
      imei: deviceInput.imei,
      price: order.price.toString(),
    })
    void notifyTelegramAdminNewOrder({
      orderCode: order.orderCode,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      serviceName: service.title,
      price: order.price.toString(),
    })
    void import('@/lib/email/notify').then(({ notifyOrderCreated, notifyAdminNewOrder }) => {
      notifyOrderCreated({ kind: 'imei', orderId: order.id })
      notifyAdminNewOrder({
        orderCode: order.orderCode,
        userName: session.user.name ?? session.user.email ?? 'Unknown',
        serviceName: service.title,
        price: order.price.toString(),
        kind: 'imei',
      })
    })

    return apiSuccess(refreshed ?? order, 201)
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return apiError('Insufficient balance. Please top up first.', 402)
    }
    console.error('[IMEI_ORDERS_POST]', e)
    return apiError('Failed to create order', 500)
  }
}
