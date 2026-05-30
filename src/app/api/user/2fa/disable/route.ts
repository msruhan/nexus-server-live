import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { verifySecondFactor } from '@/lib/auth/verify-2fa';

export const dynamic = 'force-dynamic';

const schema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().min(1, '2FA code is required'),
});

export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid data');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return apiError('2FA is not active');
    }

    const validPassword = await compare(parsed.data.password, user.password);
    if (!validPassword) {
      return apiError('Incorrect password', 401);
    }

    const ok2fa = await verifySecondFactor({
      userId: session.user.id,
      input: parsed.data.code,
      totpSecret: user.twoFactorSecret,
    });
    if (!ok2fa) {
      return apiError('Invalid 2FA code', 401);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    await prisma.backupCode.deleteMany({ where: { userId: session.user.id } });

    return apiSuccess({ enabled: false });
  } catch (e) {
    console.error('[USER_2FA_DISABLE_POST]', e);
    return apiError('Failed to disable 2FA', 500);
  }
}
