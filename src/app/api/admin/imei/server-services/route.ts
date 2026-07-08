import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import {
  createServerServiceSchema,
  resolveRequiredFieldsFromUpdate,
} from '@/lib/validations/server'
import { buildManualInternalRef } from '@/lib/service-source'
import { postNewService } from '@/lib/telegram/channel'
import { postDiscordNewService } from '@/lib/discord/webhook'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/server-services */
export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const boxId = searchParams.get('boxId')
    const status = searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | null
    const q = searchParams.get('q')

    const where: Prisma.ServerServiceWhereInput = {}
    if (boxId) where.boxId = boxId
    if (status === 'ACTIVE' || status === 'INACTIVE') where.status = status
    if (q?.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const services = await prisma.serverService.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        box: { select: { id: true, title: true } },
        api: { select: { id: true, title: true } },
      },
    })
    return apiSuccess(services)
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICES_GET]', e)
    return apiError('Failed to fetch data', 500)
  }
}

/** POST /api/admin/imei/server-services */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createServerServiceSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const [api, box] = await Promise.all([
      parsed.data.apiId ? prisma.imeiApi.findUnique({ where: { id: parsed.data.apiId } }) : Promise.resolve(null),
      prisma.serverServiceBox.findUnique({
        where: { id: parsed.data.boxId },
        select: { id: true, title: true, marketplaceVisible: true },
      }),
    ])
    if (parsed.data.sourceType === 'PROVIDER_SYNCED' && !api) return apiError('API provider not found', 404)
    if (!box) return apiError('Server group not found', 404)

    if (parsed.data.sourceType === 'PROVIDER_SYNCED' && parsed.data.apiId && parsed.data.toolId) {
      const existingLink = await prisma.serverService.findFirst({
        where: { apiId: parsed.data.apiId, toolId: parsed.data.toolId },
        select: { id: true, title: true },
      })
      if (existingLink) {
        return apiError(`Provider service already linked to "${existingLink.title}"`, 409)
      }
    }

    let internalRef: string | null = null
    if (parsed.data.sourceType === 'MANUAL') {
      const count = await prisma.serverService.count({ where: { sourceType: 'MANUAL' } })
      internalRef = buildManualInternalRef('server', count + 1)
    }

    const { fieldDefs: _fd, requiredFields: _rf, ...rest } = parsed.data
    const fieldUpdate = resolveRequiredFieldsFromUpdate(parsed.data)

    const created = await prisma.serverService.create({
      data: {
        ...rest,
        ...fieldUpdate,
        apiId: parsed.data.sourceType === 'MANUAL' ? null : parsed.data.apiId ?? null,
        toolId: parsed.data.sourceType === 'MANUAL' ? null : parsed.data.toolId ?? null,
        internalRef,
      },
      include: { box: { select: { id: true, title: true } }, api: { select: { id: true, title: true } } },
    })

    // Fire-and-forget: notify when a service is created already ACTIVE + marketplace-visible.
    if (created.status === 'ACTIVE' && box.marketplaceVisible) {
      void postNewService({
        title: created.title,
        category: box.title ?? 'Server',
        price: Number(created.price),
        deliveryTime: created.deliveryTime,
      })
      void postDiscordNewService({
        title: created.title,
        category: box.title ?? 'Server',
        price: Number(created.price),
        deliveryTime: created.deliveryTime,
      })
    }

    return apiSuccess(created, 201)
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICES_POST]', e)
    return apiError('Failed to create service', 500)
  }
}
