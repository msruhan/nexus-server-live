import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { generateBackupCodesForUser } from '@/lib/auth/backup-codes';
import { verifySecondFactor } from '@/lib/auth/verify-2fa';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(1),
});

/**
 * POST /api/user/2fa/backup-codes/regenerate
 *
 * Reissues a fresh set of one-time backup codes. Requires the current
 * password AND a valid 2FA code (TOTP or existing backup) to prevent
 * a stolen-cookie hijack from rotating codes silently.
 */
export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user?.twoFactorEnabled) return apiError('2FA is not active.', 400);

  const passOk = await compare(parsed.data.password, user.password);
  if (!passOk) return apiError('Incorrect password', 401);

  const okFactor = await verifySecondFactor({
    userId: session.user.id,
    input: parsed.data.code,
    totpSecret: user.twoFactorSecret,
  });
  if (!okFactor) return apiError('Invalid 2FA code', 401);

  const codes = await generateBackupCodesForUser(session.user.id);
  await logActivity({
    userId: session.user.id,
    action: 'auth.backup_codes_regenerated',
    entity: 'User',
    entityId: session.user.id,
  });
  return apiSuccess({ backupCodes: codes });
}
