import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** Cancel pending 2FA setup (remove temporary secret). */
export async function POST() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });
    if (!user) return apiError('User not found', 404);
    if (user.twoFactorEnabled) {
      return apiError('2FA is already active');
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: null },
    });

    return apiSuccess({ cancelled: true });
  } catch (e) {
    console.error('[USER_2FA_CANCEL_SETUP_POST]', e);
    return apiError('Failed to cancel setup', 500);
  }
}
