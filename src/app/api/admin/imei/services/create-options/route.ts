import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { fetchImeiSupplierCatalog } from '@/lib/supplier-sync/fetch-catalog'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const apiId = searchParams.get('apiId')?.trim()
    const refresh = searchParams.get('refresh') === 'true'

    const providers = await prisma.imeiApi.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, apiType: true },
    })

    if (!apiId) {
      return apiSuccess({ providers, services: [] })
    }

    const api = await prisma.imeiApi.findUnique({ where: { id: apiId } })
    if (!api) return apiError('API provider not found', 404)

    if (refresh) {
      const fetched = await fetchImeiSupplierCatalog(api)
      return apiSuccess({
        providers,
        services: fetched.rows.map((row) => ({
          toolId: row.toolId,
          title: row.title,
          groupName: row.groupName,
          price: row.price,
          deliveryTime: row.deliveryTime ?? '',
          source: 'live',
        })),
      })
    }

    const services = await prisma.imeiService.findMany({
      where: { apiId, sourceType: 'PROVIDER_SYNCED' },
      orderBy: [{ group: { title: 'asc' } }, { title: 'asc' }],
      select: {
        toolId: true,
        title: true,
        description: true,
        price: true,
        deliveryTime: true,
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
        group: { select: { title: true } },
      },
    })

    return apiSuccess({
      providers,
      services: services
        .filter((svc) => !!svc.toolId)
        .map((svc) => ({
          toolId: svc.toolId!,
          title: svc.title,
          description: svc.description,
          groupName: svc.group.title,
          price: Number(svc.price),
          deliveryTime: svc.deliveryTime ?? '',
          requiresImei: svc.requiresImei,
          requiresNetwork: svc.requiresNetwork,
          requiresModel: svc.requiresModel,
          requiresProvider: svc.requiresProvider,
          requiresPin: svc.requiresPin,
          requiresKbh: svc.requiresKbh,
          requiresMep: svc.requiresMep,
          requiresPrd: svc.requiresPrd,
          requiresSn: svc.requiresSn,
          requiresEcid: svc.requiresEcid,
          source: 'cached',
        })),
    })
  } catch (e) {
    console.error('[ADMIN_IMEI_CREATE_OPTIONS_GET]', e)
    return apiError('Failed to load create options', 500)
  }
}
