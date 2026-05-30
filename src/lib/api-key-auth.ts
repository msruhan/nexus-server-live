import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { apiError, type ApiSession } from '@/lib/api-auth';
import { getClientIp } from '@/lib/ip-utils';
import {
  clearFailureCounter,
  consumeRateBuckets,
  enforceIpPolicy,
  enforceRateLimit,
  enforceThrottle,
  recordAttempt,
  recordFailure,
} from '@/lib/api-key-security';

const API_KEY_PREFIX = 'nx_live_';
const API_KEY_BYTES = 24;

export type ApiKeyScope = 'orders:write' | 'orders:read' | 'services:read';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function makeApiKey(): { plain: string; prefix: string; hash: string } {
  const secret = randomBytes(API_KEY_BYTES).toString('hex');
  const plain = `${API_KEY_PREFIX}${secret}`;
  return {
    plain,
    prefix: plain.slice(0, 15),
    hash: hashApiKey(plain),
  };
}

export function parseScopes(value: string): ApiKeyScope[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean) as ApiKeyScope[];
}

function getIncomingApiKey(req: Request): string | null {
  const bearer = req.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }
  const direct = req.headers.get('x-api-key');
  return direct?.trim() || null;
}

function getIncomingApiUsername(req: Request): string | null {
  const value = req.headers.get('x-api-username')?.trim().toLowerCase();
  return value || null;
}

export async function requireApiKeyAuth(
  req: Request,
  requiredScope?: ApiKeyScope,
): Promise<
  | {
      ok: true;
      user: ApiSession['user'];
      apiKeyId: string;
      scopes: ApiKeyScope[];
    }
  | {
      ok: false;
      error: Response;
    }
> {
  const incoming = getIncomingApiKey(req);
  if (!incoming) {
    return { ok: false, error: apiError('Missing API key', 401) };
  }
  const apiUsername = getIncomingApiUsername(req);
  if (!apiUsername) {
    return { ok: false, error: apiError('Missing API username (x-api-username)', 401) };
  }

  const prefix = incoming.slice(0, 15);
  const key = await prisma.apiKey.findFirst({
    where: {
      keyPrefix: prefix,
      apiUsername,
    },
    include: {
      user: { select: { id: true, role: true, name: true, email: true, isActive: true } },
    },
  });
  if (!key || !key.isActive || !key.user.isActive) {
    return { ok: false, error: apiError('Invalid API key', 401) };
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: apiError('API key expired', 401) };
  }

  const incomingHash = hashApiKey(incoming);
  const a = Buffer.from(incomingHash, 'utf8');
  const b = Buffer.from(key.keyHash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    void recordFailure(key.id);
    void recordAttempt({
      apiKeyId: key.id,
      outcome: 'REJECTED_AUTH',
      reason: 'API key hash mismatch',
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    });
    return { ok: false, error: apiError('Invalid API key', 401) };
  }

  const scopes = parseScopes(key.scopes);
  if (requiredScope && !scopes.includes(requiredScope)) {
    void recordAttempt({
      apiKeyId: key.id,
      outcome: 'REJECTED_SCOPE',
      reason: `Missing scope: ${requiredScope}`,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    });
    return { ok: false, error: apiError('API key scope forbidden', 403) };
  }

  // ─── Security policy (opt-in) ──────────────────────────────
  // All checks degrade gracefully: keys with default/null settings
  // skip these checks entirely, so legacy behavior is preserved.
  const clientIp = getClientIp(req);
  const userAgent = req.headers.get('user-agent');

  const throttle = enforceThrottle(key);
  if (!throttle.ok) {
    void recordAttempt({
      apiKeyId: key.id,
      outcome: throttle.outcome,
      reason: throttle.reason,
      ip: clientIp,
      userAgent,
    });
    return { ok: false, error: apiError(throttle.reason, throttle.status) };
  }

  const ipCheck = await enforceIpPolicy(key, clientIp, userAgent);
  if (!ipCheck.ok) {
    void recordFailure(key.id);
    void recordAttempt({
      apiKeyId: key.id,
      outcome: ipCheck.outcome,
      reason: ipCheck.reason,
      ip: clientIp,
      userAgent,
    });
    return { ok: false, error: apiError(ipCheck.reason, ipCheck.status) };
  }

  const rateCheck = await enforceRateLimit(key);
  if (!rateCheck.ok) {
    void recordAttempt({
      apiKeyId: key.id,
      outcome: rateCheck.outcome,
      reason: rateCheck.reason,
      ip: clientIp,
      userAgent,
    });
    return { ok: false, error: apiError(rateCheck.reason, rateCheck.status) };
  }

  // Mark success. Update lastUsedAt + accounting in parallel; do not block.
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  void clearFailureCounter(key.id);
  void consumeRateBuckets(
    key.id,
    (key.rateLimitPerMinute ?? 0) > 0,
    (key.rateLimitPerHour ?? 0) > 0,
  );
  void recordAttempt({
    apiKeyId: key.id,
    outcome: 'ALLOWED',
    ip: clientIp,
    userAgent,
  });

  return {
    ok: true,
    apiKeyId: key.id,
    scopes,
    user: {
      id: key.user.id,
      role: key.user.role as 'ADMIN' | 'USER',
      name: key.user.name,
      email: key.user.email,
    },
  };
}
