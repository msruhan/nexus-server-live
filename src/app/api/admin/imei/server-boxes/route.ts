import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createBoxSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2048).optional().nullable(),
  marketplaceVisible: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().default(0),
})

/** GET /api/admin/imei/server-boxes — list all server boxes */
export async function GET() {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const boxes = await prisma.serverServiceBox.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { services: true } } },
    })
    return apiSuccess(boxes)
  } catch (e) {
    console.error('[ADMIN_SERVER_BOXES_GET]', e)
    return apiError('Failed to fetch data', 500)
  }
}

/** POST /api/admin/imei/server-boxes — create a new server box */
export async function POST(req: Request) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const parsed = createBoxSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)
    const created = await prisma.serverServiceBox.create({ data: parsed.data })
    return apiSuccess(created, 201)
  } catch (e) {
    console.error('[ADMIN_SERVER_BOXES_POST]', e)
    return apiError('Failed to create server box', 500)
  }
}
