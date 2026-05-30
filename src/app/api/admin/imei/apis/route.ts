import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import {
  prepareImeiApiWriteData,
  sanitizeImeiApiForAdmin,
  sanitizeImeiApiListForAdmin,
} from '@/lib/crypto/imei-api-secret'
import { CryptoKeyError } from '@/lib/crypto/encryption'
import { createImeiApiSchema } from '@/lib/validations/imei'

export const dynamic = 'force-dynamic'

/** GET /api/admin/imei/apis — list all API providers */
export async function GET() {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const apis = await prisma.imeiApi.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { services: true } },
      },
    })
    return apiSuccess(sanitizeImeiApiListForAdmin(apis))
  } catch (e) {
    console.error('[ADMIN_IMEI_APIS_GET]', e)
    return apiError('Failed to fetch data API', 500)
  }
}

/** POST /api/admin/imei/apis — create a new API provider */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createImeiApiSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message)
    }

    const created = await prisma.imeiApi.create({
      data: prepareImeiApiWriteData(parsed.data),
    })
    return apiSuccess(sanitizeImeiApiForAdmin(created), 201)
  } catch (e) {
    console.error('[ADMIN_IMEI_APIS_POST]', e)
    if (e instanceof CryptoKeyError) {
      return apiError(
        'DATA_ENCRYPTION_KEY is not configured. Run: openssl rand -base64 32 then set it in .env',
        503,
      )
    }
    return apiError('Failed to create API provider', 500)
  }
}
