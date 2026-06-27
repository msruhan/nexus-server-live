import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { computeImportPricing } from '@/lib/supplier-sync/apply-catalog'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  services: z.array(
    z.object({
      toolId: z.string(),
      title: z.string(),
      groupName: z.string(),
      price: z.number(),
      supplierPrice: z.number().optional(),
      deliveryTime: z.string().optional().default(''),
      requiresNetwork: z.boolean().default(false),
      requiresModel: z.boolean().default(false),
      requiresProvider: z.boolean().default(false),
      requiresPin: z.boolean().default(false),
      requiresKbh: z.boolean().default(false),
      requiresMep: z.boolean().default(false),
      requiresPrd: z.boolean().default(false),
      requiresSn: z.boolean().default(false),
      requiresEcid: z.boolean().default(false),
    }),
  ).min(1, 'Select at least one service'),
})

/**
 * POST /api/admin/imei/apis/[id]/import
 * Import selected services from the sync result into the database.
 * Auto-creates service groups if they don't exist.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const api = await prisma.imeiApi.findUnique({ where: { id } })
    if (!api) return apiError('API provider not found', 404)

    const body = await req.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const { services } = parsed.data

    // Collect unique group names and ensure they exist
    const groupNames = [...new Set(services.map((s) => s.groupName))]
    const existingGroups = await prisma.imeiServiceGroup.findMany({
      where: { title: { in: groupNames } },
    })
    const groupMap = new Map(existingGroups.map((g) => [g.title, g.id]))

    // Create missing groups
    for (const name of groupNames) {
      if (!groupMap.has(name)) {
        const created = await prisma.imeiServiceGroup.create({
          data: { title: name },
        })
        groupMap.set(name, created.id)
      }
    }

    // Skip services that are already imported (by toolId + apiId)
    const existingToolIds = await prisma.imeiService.findMany({
      where: { apiId: id, toolId: { in: services.map((s) => s.toolId) } },
      select: { toolId: true },
    })
    const alreadyImported = new Set(existingToolIds.map((s) => s.toolId))

    const toImport = services.filter((s) => !alreadyImported.has(s.toolId))

    if (toImport.length === 0) {
      return apiSuccess({ imported: 0, skipped: services.length, message: 'All services were already imported' })
    }

    // Batch create
    const defaultMargin =
      api.defaultFixedMargin != null ? Number(api.defaultFixedMargin) : null

    const createData = toImport.map((svc) => {
      const supplier = svc.supplierPrice ?? svc.price
      const retail = svc.price
      const computed = computeImportPricing(supplier, retail, defaultMargin)
      return {
        apiId: id,
        groupId: groupMap.get(svc.groupName)!,
        toolId: svc.toolId,
        title: svc.title,
        price: computed.price,
        supplierPrice: computed.supplierPrice,
        fixedMargin: computed.fixedMargin,
        deliveryTime: svc.deliveryTime || null,
        status: 'ACTIVE' as const,
        requiresNetwork: svc.requiresNetwork,
        requiresModel: svc.requiresModel,
        requiresProvider: svc.requiresProvider,
        requiresPin: svc.requiresPin,
        requiresKbh: svc.requiresKbh,
        requiresMep: svc.requiresMep,
        requiresPrd: svc.requiresPrd,
        requiresSn: svc.requiresSn,
        requiresEcid: svc.requiresEcid,
        requiresImei: !(svc.requiresSn || svc.requiresEcid),
      }
    })

    await prisma.imeiService.createMany({ data: createData })

    return apiSuccess({
      imported: toImport.length,
      skipped: services.length - toImport.length,
      message: `${toImport.length} services imported successfully`,
    }, 201)
  } catch (e) {
    console.error('[ADMIN_IMEI_API_IMPORT]', e)
    return apiError('Import failed services', 500)
  }
}
