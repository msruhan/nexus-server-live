import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { decryptImeiApiKey } from '@/lib/crypto/imei-api-secret'
import {
  DhruFusionClient,
  DhruFusionProClient,
  isClassicDhruApiKey,
  isDhruProSkippedOrUnavailable,
  isImeiProProduct,
} from '@/lib/dhru-fusion'
import { formatDhruSupplierUserMessage } from '@/lib/dhru-supplier-messages'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imei/apis/[id]/sync
 * Fetch IMEI service list from the supplier API.
 * Tries Pro API first (GET /products), falls back to Classic (imeiservicelist).
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const api = await prisma.imeiApi.findUnique({ where: { id } })
    if (!api) return apiError('API provider not found', 404)
    if (api.status !== 'ACTIVE') return apiError('API provider is not active', 400)

    const apiKey = decryptImeiApiKey(api.apiKey)

    // Pro REST uses Bearer tokens; dashed keys are Classic (legitunlocks, luteam, …).
    let proResult: Awaited<ReturnType<DhruFusionProClient['getProducts']>> = {
      success: false,
      error: 'Skipped — Classic API key format',
    }

    if (!isClassicDhruApiKey(apiKey)) {
      const proClient = new DhruFusionProClient({
        host: api.host,
        username: api.username,
        apiKey,
      })
      proResult = await proClient.getProducts()
    }

    const imeiProducts =
      proResult.success && proResult.products
        ? proResult.products.filter(isImeiProProduct)
        : []

    if (imeiProducts.length > 0) {
      const existingServices = await prisma.imeiService.findMany({
        where: { apiId: id },
        select: { toolId: true },
      })
      const importedToolIds = new Set(existingServices.map((s) => s.toolId).filter(Boolean))

      const services = imeiProducts.map((p) => {
        const fieldNames = (p.fields || []).map((f) => f.name.toLowerCase())
        return {
          toolId: p.uuid,
          title: p.name,
          groupName: proResult.categories?.find((c) => p.cids.includes(c.id))?.name || 'Uncategorized',
          price: p.price,
          deliveryTime: '',
          requiresNetwork: fieldNames.some((n) => n.includes('network') || n.includes('carrier')),
          requiresModel: fieldNames.some((n) => n.includes('model') || n.includes('device')),
          requiresProvider: fieldNames.some((n) => n.includes('provider')),
          requiresPin: fieldNames.some((n) => n.includes('pin')),
          requiresKbh: fieldNames.some((n) => n.includes('kbh')),
          requiresMep: fieldNames.some((n) => n.includes('mep')),
          requiresPrd: fieldNames.some((n) => n.includes('prd')),
          requiresSn: fieldNames.some((n) => n.includes('serial')),
          requiresEcid: fieldNames.some((n) => n.includes('ecid')),
          alreadyImported: importedToolIds.has(p.uuid),
        }
      })

      return apiSuccess({
        apiId: id,
        apiTitle: api.title,
        apiVersion: 'pro',
        totalServices: services.length,
        alreadyImported: services.filter((s) => s.alreadyImported).length,
        services,
      })
    }

    // Fallback to Classic API
    const classicClient = new DhruFusionClient({
      host: api.host,
      username: api.username,
      apiKey,
    })

    const result = await classicClient.getImeiServiceList()

    if (!result.success) {
      const proUnavailable = isDhruProSkippedOrUnavailable(proResult.error)
      const errorMsg = proUnavailable
        ? result.error || 'Failed to fetch service list from supplier'
        : proResult.error
          ? `Pro API: ${proResult.error}. Classic API: ${result.error}`
          : result.error || 'Failed to fetch service list from supplier'
      return apiError(formatDhruSupplierUserMessage(errorMsg), 502)
    }

    // Get existing toolIds for this API to mark which are already imported
    const existingServices = await prisma.imeiService.findMany({
      where: { apiId: id },
      select: { toolId: true },
    })
    const importedToolIds = new Set(existingServices.map((s) => s.toolId).filter(Boolean))

    const servicesWithStatus = result.services.map((svc) => ({
      ...svc,
      alreadyImported: importedToolIds.has(svc.toolId),
    }))

    return apiSuccess({
      apiId: id,
      apiTitle: api.title,
      apiVersion: 'classic',
      totalServices: servicesWithStatus.length,
      alreadyImported: servicesWithStatus.filter((s) => s.alreadyImported).length,
      services: servicesWithStatus,
    })
  } catch (e) {
    console.error('[ADMIN_IMEI_API_SYNC]', e)
    return apiError('Failed to sync from supplier', 500)
  }
}
