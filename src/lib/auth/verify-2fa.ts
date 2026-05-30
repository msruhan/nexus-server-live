import { consumeBackupCode, isBackupCodeInput } from '@/lib/auth/backup-codes';
import { consumeTotpCode, TotpReplayError } from '@/lib/auth/totp-replay';
import { readTotpSecretPlain } from '@/lib/crypto/totp-secret';
import { verifyTotpCode } from '@/lib/totp';

export { TotpReplayError };

/**
 * Verify second factor: TOTP (6 digit) or backup code (`bc:XXXX-XXXX` or `XXXX-XXXX`).
 */
export async function verifySecondFactor(opts: {
  userId: string;
  input: string;
  totpSecret: string | null;
}): Promise<boolean> {
  const raw = opts.input.trim();
  if (!raw) return false;

  if (isBackupCodeInput(raw)) {
    return consumeBackupCode(opts.userId, raw);
  }

  const totpSecret = readTotpSecretPlain(opts.totpSecret);
  if (!totpSecret) return false;
  const valid = await verifyTotpCode(raw, totpSecret);
  if (!valid) return false;

  await consumeTotpCode(opts.userId, raw);
  return true;
}
