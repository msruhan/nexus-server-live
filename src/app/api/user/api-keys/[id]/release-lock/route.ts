import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';
import { getClientIp } from '@/lib/ip-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/api-keys/:id/release-lock
 *
 * Release the IP lock on a key in lock_first mode. Next request from
 * any IP will rebind. We keep audit trail in ActivityLog.
 *
 * Only the key owner can release. Note: an attacker who already has the
 * key value but is on a different IP cannot release because they don't
 * have a valid web session — releasing requires being logged into the
 * dashboard.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, ipMode: true, lockedIp: true },
  });
  if (!key) return apiError('API key not found', 404);
  if (!key.lockedIp) return apiError('No IP lock to release', 400);

  await prisma.apiKey.update({
    where: { id },
    data: { lockedIp: null, lockedAt: null, lockedByUa: null },
  });

  await logActivity({
    userId: session.user.id,
    action: 'api_key.lock_released',
    entity: 'ApiKey',
    entityId: id,
    ipAddress: getClientIp(req) ?? undefined,
    metadata: { previousLockedIp: key.lockedIp },
  });

  return apiSuccess({ released: true });
}
