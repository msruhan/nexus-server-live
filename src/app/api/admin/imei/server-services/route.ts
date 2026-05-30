import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  apiId: z.string().min(1),
  boxId: z.string().min(1),
  toolId: z.string().optional().nullable(),
  title: z.string().min(2).max(500),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  deliveryTime: z.string().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  requiredFields: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

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
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)

    const created = await prisma.serverService.create({
      data: parsed.data,
      include: { box: { select: { id: true, title: true } }, api: { select: { id: true, title: true } } },
    })
    return apiSuccess(created, 201)
  } catch (e) {
    console.error('[ADMIN_SERVER_SERVICES_POST]', e)
    return apiError('Failed to create service', 500)
  }
}
