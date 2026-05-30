import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) return apiError('User not found', 404);

    return apiSuccess({
      enabled: user.twoFactorEnabled,
      pendingSetup: Boolean(user.twoFactorSecret && !user.twoFactorEnabled),
    });
  } catch (e) {
    console.error('[USER_2FA_GET]', e);
    return apiError('Failed to load 2FA status', 500);
  }
}
