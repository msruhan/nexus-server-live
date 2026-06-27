import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export function createEmailVerificationToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const hash = hashVerificationToken(token);
  return {
    token,
    hash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  };
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
