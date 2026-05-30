const REPLAY_TTL_SEC = 90;
const memoryKeys = new Map<string, number>();

export class TotpReplayError extends Error {
  readonly code = 'INVALID_TOTP_REPLAY';

  constructor() {
    super('This 2FA code was already used. Wait for a new code from your authenticator app.');
    this.name = 'TotpReplayError';
  }
}

function replayKey(userId: string, code: string): string {
  return `totp-replay:${userId}:${code.replace(/\s/g, '')}`;
}

function markConsumedMemory(key: string): boolean {
  const now = Date.now();
  const existing = memoryKeys.get(key);
  if (existing && existing > now) return false;
  memoryKeys.set(key, now + REPLAY_TTL_SEC * 1000);
  return true;
}

/**
 * Mark TOTP code as used for this user (90s window). Throws if already consumed.
 * Call only after cryptographic TOTP verification succeeds.
 */
export async function consumeTotpCode(userId: string, code: string): Promise<void> {
  const key = replayKey(userId, code);
  if (!markConsumedMemory(key)) throw new TotpReplayError();
}
