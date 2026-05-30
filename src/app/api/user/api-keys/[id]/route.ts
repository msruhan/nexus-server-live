import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  apiUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'Username must be 3-32 chars (a-z, 0-9, dot, underscore, dash)')
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');
    if (
      !parsed.data.name &&
      typeof parsed.data.apiUsername === 'undefined' &&
      typeof parsed.data.isActive === 'undefined'
    ) {
      return apiError('No changes provided');
    }

    const current = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!current) return apiError('API key not found', 404);

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        name: parsed.data.name,
        apiUsername: parsed.data.apiUsername,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        name: true,
        apiUsername: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return apiError('API username already used. Pick another one.', 409);
    }
    console.error('[USER_API_KEYS_PATCH]', e);
    return apiError('Failed to update API key', 500);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const found = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!found) return apiError('API key not found', 404);

    await prisma.apiKey.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('[USER_API_KEYS_DELETE]', e);
    return apiError('Failed to delete API key', 500);
  }
}
