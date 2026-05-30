import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { generateBackupCodesForUser } from '@/lib/auth/backup-codes';
import { consumeTotpCode } from '@/lib/auth/totp-replay';
import { readTotpSecretPlain } from '@/lib/crypto/totp-secret';
import { verifyTotpCode } from '@/lib/totp';

export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{6}$/, 'Code must be 6 digits')),
});

export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid verification code');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorSecret) {
      return apiError('Run 2FA setup first');
    }
    if (user.twoFactorEnabled) {
      return apiError('2FA is already active');
    }

    const totpPlain = readTotpSecretPlain(user.twoFactorSecret);
    if (!totpPlain || !(await verifyTotpCode(parsed.data.code, totpPlain))) {
      return apiError('Invalid Google Authenticator code', 401);
    }
    await consumeTotpCode(session.user.id, parsed.data.code);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: true },
    });

    const backupCodes = await generateBackupCodesForUser(session.user.id);
    return apiSuccess({
      enabled: true,
      backupCodes,
      message: 'Save your backup codes — they are shown only once.',
    });
  } catch (e) {
    console.error('[USER_2FA_ENABLE_POST]', e);
    return apiError('Failed to enable 2FA', 500);
  }
}
