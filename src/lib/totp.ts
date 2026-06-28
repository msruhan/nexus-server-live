import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { DEFAULT_SITE_NAME } from '@/lib/site-name';

/** Toleransi drift jam (detik). Period TOTP = 30s → ±1 langkah waktu. */
const EPOCH_TOLERANCE_SECONDS = 30;

export function generateTotpSecret(): string {
  return generateSecret();
}

export function normalizeTotpSecret(secret: string): string {
  return secret.trim().replace(/\s/g, '').toUpperCase();
}

export function buildTotpUri(email: string, secret: string, issuer?: string): string {
  return generateURI({
    issuer: issuer?.trim() || DEFAULT_SITE_NAME,
    label: email,
    secret: normalizeTotpSecret(secret),
  });
}

export async function totpQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { width: 220, margin: 2 });
}

export async function verifyTotpCode(token: string, secret: string): Promise<boolean> {
  const code = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;

  const normalizedSecret = normalizeTotpSecret(secret);
  if (!normalizedSecret) return false;

  const result = await verify({
    token: code,
    secret: normalizedSecret,
    epochTolerance: EPOCH_TOLERANCE_SECONDS,
  });
  return result.valid;
}
