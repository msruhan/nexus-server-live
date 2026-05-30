import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import {
  prepareImeiApiWriteData,
  sanitizeImeiApiForAdmin,
} from '@/lib/crypto/imei-api-secret'
import { CryptoKeyError } from '@/lib/crypto/encryption'
import { updateImeiApiSchema } from '@/lib/validations/imei'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/apis/[id] — get one API provider */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const api = await prisma.imeiApi.findUnique({
      where: { id },
      include: {
        services: {
          orderBy: { title: 'asc' },
          include: { group: { select: { id: true, title: true } } },
        },
      },
    })
    if (!api) return apiError('API provider not found', 404)
    return apiSuccess({
      ...sanitizeImeiApiForAdmin(api),
      services: api.services,
    })
  } catch (e) {
    console.error('[ADMIN_IMEI_API_GET]', e)
    return apiError('Failed to fetch data API', 500)
  }
}

/** PATCH /api/admin/imei/apis/[id] — update an API provider */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateImeiApiSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const updated = await prisma.imeiApi.update({
      where: { id },
      data: prepareImeiApiWriteData(parsed.data),
    })
    return apiSuccess(sanitizeImeiApiForAdmin(updated))
  } catch (e) {
    console.error('[ADMIN_IMEI_API_PATCH]', e)
    if (e instanceof CryptoKeyError) {
      return apiError(
        'DATA_ENCRYPTION_KEY is not configured. Run: openssl rand -base64 32 then set it in .env',
        503,
      )
    }
    return apiError('Failed to update API', 500)
  }
}

/** DELETE /api/admin/imei/apis/[id] — delete an API provider */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    // Check if there are services attached
    const servicesCount = await prisma.imeiService.count({ where: { apiId: id } })
    if (servicesCount > 0) {
      return apiError(
        `${servicesCount} service(s) still linked to this API. Delete the services first.`,
        409,
      )
    }
    await prisma.imeiApi.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    console.error('[ADMIN_IMEI_API_DELETE]', e)
    return apiError('Failed to delete API', 500)
  }
}
