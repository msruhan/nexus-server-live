import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import {
  encryptTotpSecretForStorage,
  readTotpSecretPlain,
} from '@/lib/crypto/totp-secret';
import { buildTotpUri, generateTotpSecret, totpQrDataUrl } from '@/lib/totp';

export const dynamic = 'force-dynamic';

/** Generate TOTP secret + QR for Google Authenticator (not enabled until verified). */
export async function POST() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) return apiError('User not found', 404);
    if (user.twoFactorEnabled) {
      return apiError('2FA is already active. Disable it first to set up again.');
    }

    let secret = readTotpSecretPlain(user.twoFactorSecret);

    if (!secret) {
      secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          twoFactorSecret: encryptTotpSecretForStorage(secret),
          twoFactorEnabled: false,
        },
      });
    }

    const otpauthUri = buildTotpUri(user.email, secret);
    const qrDataUrl = await totpQrDataUrl(otpauthUri);

    return apiSuccess({
      qrDataUrl,
      manualEntryKey: secret,
      reusedPendingSecret: Boolean(user.twoFactorSecret),
    });
  } catch (e) {
    console.error('[USER_2FA_SETUP_POST]', e);
    return apiError('Failed to set up 2FA', 500);
  }
}
