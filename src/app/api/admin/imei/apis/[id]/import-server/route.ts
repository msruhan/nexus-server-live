import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { parseServerFieldDefs, serializeServerFieldDefs } from '@/lib/server-fields'
import { z } from 'zod'

function normalizeRequiredFields(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const defs = parseServerFieldDefs(raw)
  return defs.length > 0 ? serializeServerFieldDefs(defs) : raw
}

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  services: z.array(
    z.object({
      toolId: z.string(),
      title: z.string(),
      groupName: z.string(),
      price: z.number(),
      deliveryTime: z.string().optional().default(''),
      requiredFields: z.string().optional().default(''),
    }),
  ).min(1),
})

/**
 * POST /api/admin/imei/apis/[id]/import-server
 * Import selected server services into the database.
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

    // Ensure server boxes exist for each group
    const boxNames = [...new Set(services.map((s) => s.groupName))]
    const existingBoxes = await prisma.serverServiceBox.findMany({
      where: { title: { in: boxNames } },
    })
    const boxMap = new Map(existingBoxes.map((b) => [b.title, b.id]))

    for (const name of boxNames) {
      if (!boxMap.has(name)) {
        const created = await prisma.serverServiceBox.create({ data: { title: name } })
        boxMap.set(name, created.id)
      }
    }

    // Skip already imported
    const existingToolIds = await prisma.serverService.findMany({
      where: { apiId: id, toolId: { in: services.map((s) => s.toolId) } },
      select: { toolId: true },
    })
    const alreadyImported = new Set(existingToolIds.map((s) => s.toolId))
    const toImport = services.filter((s) => !alreadyImported.has(s.toolId))

    if (toImport.length === 0) {
      return apiSuccess({ imported: 0, skipped: services.length, message: 'All services were already imported' })
    }

    const createData = toImport.map((svc) => ({
      apiId: id,
      boxId: boxMap.get(svc.groupName)!,
      toolId: svc.toolId,
      title: svc.title,
      price: svc.price,
      deliveryTime: svc.deliveryTime || null,
      requiredFields: normalizeRequiredFields(svc.requiredFields) || null,
      status: 'ACTIVE' as const,
    }))

    await prisma.serverService.createMany({ data: createData })

    return apiSuccess({
      imported: toImport.length,
      skipped: services.length - toImport.length,
      message: `${toImport.length} server services imported successfully`,
    }, 201)
  } catch (e) {
    console.error('[ADMIN_API_IMPORT_SERVER]', e)
    return apiError('Import failed', 500)
  }
}
