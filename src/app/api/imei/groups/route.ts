import { prisma } from '@/lib/db'
import { apiError, apiSuccess } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/** GET /api/imei/groups — public list of service groups (with active service counts) */
export async function GET() {
  try {
    const groups = await prisma.imeiServiceGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        _count: { select: { services: { where: { status: 'ACTIVE' } } } },
      },
    })
    return apiSuccess(groups)
  } catch (e) {
    console.error('[IMEI_GROUPS_GET]', e)
    return apiError('Failed to fetch group', 500)
  }
}
