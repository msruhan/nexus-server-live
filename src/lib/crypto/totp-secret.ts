import { encryptSecretField, decryptSecretField } from '@/lib/crypto/secret-field';
import { normalizeTotpSecret } from '@/lib/totp';

/** Plain TOTP secret for otplib / QR (decrypts envelope if needed). */
export function readTotpSecretPlain(stored: string | null | undefined): string | null {
  const plain = decryptSecretField(stored);
  if (!plain) return null;
  return normalizeTotpSecret(plain);
}

/** Persist TOTP secret (normalized + encrypted). */
export function encryptTotpSecretForStorage(plainSecret: string): string {
  return encryptSecretField(normalizeTotpSecret(plainSecret));
}
