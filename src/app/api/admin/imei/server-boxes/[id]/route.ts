import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateBoxSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2048).optional().nullable(),
  marketplaceVisible: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = updateBoxSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.issues[0].message)
    const updated = await prisma.serverServiceBox.update({ where: { id }, data: parsed.data })
    return apiSuccess(updated)
  } catch (e) {
    console.error('[ADMIN_SERVER_BOX_PATCH]', e)
    return apiError('Failed to update', 500)
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error
  try {
    const { id } = await context.params
    const count = await prisma.serverService.count({ where: { boxId: id } })
    if (count > 0) return apiError(`${count} service still linked`, 409)
    await prisma.serverServiceBox.delete({ where: { id } })
    return apiSuccess({ id })
  } catch (e) {
    console.error('[ADMIN_SERVER_BOX_DELETE]', e)
    return apiError('Failed to delete', 500)
  }
}
