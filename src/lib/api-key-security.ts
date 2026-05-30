/**
 * API key security policy enforcement.
 *
 * This module is the SINGLE place where opt-in security checks for API
 * keys live (IP policy, rate limit, spend limit, throttle on failures).
 *
 * Design rules:
 *   1. Every check is OPT-IN. A key with default settings (`ipMode = "none"`,
 *      no rate / spend limits) behaves identically to before this module
 *      was introduced. This is a hard requirement for a non-breaking rollout.
 *   2. Failures here MUST never throw — we degrade to "allow" on internal
 *      errors and log the issue. Reseller traffic must not be blocked by
 *      bugs in this layer.
 *   3. Atomic IP binding for `lock_first` mode uses a conditional update
 *      (`where: { id, lockedIp: null }`) to prevent two concurrent requests
 *      from racing past the check.
 */
import type { ApiKey } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ipMatchesAny } from '@/lib/ip-utils';

export type SecurityOutcome =
  | { ok: true }
  | { ok: false; status: number; reason: string; outcome: AttemptOutcome };

export type AttemptOutcome =
  | 'ALLOWED'
  | 'REJECTED_IP'
  | 'REJECTED_SCOPE'
  | 'REJECTED_RATE'
  | 'REJECTED_SPEND'
  | 'REJECTED_AUTH'
  | 'REJECTED_THROTTLE';

const ATTEMPT_LOG_RETENTION = 200;

function csvToList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Check if a key is currently inside a throttle window from previous
 * consecutive failures.
 */
function isThrottled(key: Pick<ApiKey, 'throttleUntil'>): boolean {
  if (!key.throttleUntil) return false;
  return key.throttleUntil.getTime() > Date.now();
}

/**
 * Enforce IP policy for the given key. Returns an outcome describing
 * whether to allow the request, and whether the key was just bound to a
 * new IP (lock_first auto-bind).
 */
export async function enforceIpPolicy(
  key: ApiKey,
  clientIp: string | null,
  userAgent: string | null,
): Promise<SecurityOutcome & { binded?: boolean }> {
  if (key.ipMode === 'none') return { ok: true };

  if (!clientIp) {
    // We require a resolvable IP for any policy other than "none".
    return {
      ok: false,
      status: 403,
      reason: 'Cannot determine client IP for IP-restricted key',
      outcome: 'REJECTED_IP',
    };
  }

  if (key.ipMode === 'allowlist') {
    const list = csvToList(key.allowedIps);
    if (list.length === 0) {
      // Empty allowlist = nothing allowed. Owner needs to configure it.
      return {
        ok: false,
        status: 403,
        reason: 'IP allowlist is empty. Owner must configure allowed IPs.',
        outcome: 'REJECTED_IP',
      };
    }
    if (ipMatchesAny(clientIp, list)) return { ok: true };
    return {
      ok: false,
      status: 403,
      reason: `IP ${clientIp} not in allowlist`,
      outcome: 'REJECTED_IP',
    };
  }

  if (key.ipMode === 'lock_first') {
    if (!key.lockedIp) {
      // Atomic bind: only update if the field is still null.
      try {
        const updated = await prisma.apiKey.updateMany({
          where: { id: key.id, lockedIp: null },
          data: {
            lockedIp: clientIp,
            lockedAt: new Date(),
            lockedByUa: userAgent?.slice(0, 500) ?? null,
          },
        });
        if (updated.count === 0) {
          // Lost the race; re-read and check again.
          const fresh = await prisma.apiKey.findUnique({
            where: { id: key.id },
            select: { lockedIp: true },
          });
          if (fresh?.lockedIp && fresh.lockedIp !== clientIp) {
            return {
              ok: false,
              status: 403,
              reason: 'Key was just locked to a different IP. Wait or release the lock.',
              outcome: 'REJECTED_IP',
            };
          }
          return { ok: true, binded: true };
        }
        return { ok: true, binded: true };
      } catch {
        // Don't punish the request for an internal hiccup during bind.
        return { ok: true };
      }
    }
    if (key.lockedIp === clientIp) return { ok: true };
    return {
      ok: false,
      status: 403,
      reason:
        'API key is locked to a different IP. Owner must release the lock from the dashboard before using a new IP.',
      outcome: 'REJECTED_IP',
    };
  }

  // Unknown mode — fail open and log via caller.
  return { ok: true };
}

/**
 * Sliding-ish rate limit using minute and hour buckets stored in DB.
 *
 * We keep this DB-based (no Redis dep) by rounding the timestamp to the
 * floor of the bucket window and using an upsert+increment pattern.
 *
 * We DO NOT consume buckets on rejected requests — only on accepted ones.
 * That keeps the limit honest: a flood of 401s won't lock out a legit
 * client whose key was briefly disabled.
 */
export async function enforceRateLimit(key: ApiKey): Promise<SecurityOutcome> {
  const perMin = key.rateLimitPerMinute ?? 0;
  const perHour = key.rateLimitPerHour ?? 0;
  if (perMin <= 0 && perHour <= 0) return { ok: true };

  const now = new Date();

  if (perMin > 0) {
    const minuteFloor = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        0,
        0,
      ),
    );
    const bucket = await prisma.apiKeyRateBucket.findUnique({
      where: { apiKeyId_scope_bucketAt: { apiKeyId: key.id, scope: 'minute', bucketAt: minuteFloor } },
      select: { count: true },
    });
    if (bucket && bucket.count >= perMin) {
      return {
        ok: false,
        status: 429,
        reason: `Rate limit exceeded (${perMin} per minute)`,
        outcome: 'REJECTED_RATE',
      };
    }
  }

  if (perHour > 0) {
    const hourFloor = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        0,
        0,
        0,
      ),
    );
    const bucket = await prisma.apiKeyRateBucket.findUnique({
      where: { apiKeyId_scope_bucketAt: { apiKeyId: key.id, scope: 'hour', bucketAt: hourFloor } },
      select: { count: true },
    });
    if (bucket && bucket.count >= perHour) {
      return {
        ok: false,
        status: 429,
        reason: `Rate limit exceeded (${perHour} per hour)`,
        outcome: 'REJECTED_RATE',
      };
    }
  }

  return { ok: true };
}

/** Increment rate buckets after we accepted the request. */
export async function consumeRateBuckets(keyId: string, hasMin: boolean, hasHour: boolean) {
  if (!hasMin && !hasHour) return;
  const now = new Date();
  const minuteFloor = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0,
    ),
  );
  const hourFloor = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0,
      0,
      0,
    ),
  );
  try {
    if (hasMin) {
      await prisma.apiKeyRateBucket.upsert({
        where: { apiKeyId_scope_bucketAt: { apiKeyId: keyId, scope: 'minute', bucketAt: minuteFloor } },
        create: { apiKeyId: keyId, scope: 'minute', bucketAt: minuteFloor, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
    if (hasHour) {
      await prisma.apiKeyRateBucket.upsert({
        where: { apiKeyId_scope_bucketAt: { apiKeyId: keyId, scope: 'hour', bucketAt: hourFloor } },
        create: { apiKeyId: keyId, scope: 'hour', bucketAt: hourFloor, count: 1 },
        update: { count: { increment: 1 } },
      });
    }
  } catch (e) {
    console.error('[api-key-security] failed to consume rate bucket', e);
  }
}

/** Throttle window check (after consecutive failures). */
export function enforceThrottle(key: ApiKey): SecurityOutcome {
  if (!isThrottled(key)) return { ok: true };
  const seconds = Math.max(1, Math.ceil((key.throttleUntil!.getTime() - Date.now()) / 1000));
  return {
    ok: false,
    status: 429,
    reason: `API key temporarily throttled after repeated failures. Retry in ${seconds}s.`,
    outcome: 'REJECTED_THROTTLE',
  };
}

/** Reset failure counter when a request is fully accepted. */
export async function clearFailureCounter(keyId: string) {
  try {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { consecutiveFails: 0, throttleUntil: null },
    });
  } catch {
    /* ignore */
  }
}

/**
 * Increment failure counter; engage progressive throttle once threshold
 * is reached. Threshold is conservative (10 fails → 5 min throttle) so
 * that genuine flapping doesn't block production traffic.
 */
export async function recordFailure(keyId: string) {
  try {
    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { consecutiveFails: { increment: 1 } },
      select: { consecutiveFails: true },
    });
    if (updated.consecutiveFails >= 10) {
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          throttleUntil: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Append an entry to the attempt log + trim oldest entries beyond the
 * retention window. We do this best-effort, never blocking the request.
 */
export async function recordAttempt(input: {
  apiKeyId: string;
  outcome: AttemptOutcome;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
  action?: string | null;
}): Promise<void> {
  try {
    await prisma.apiKeyAttemptLog.create({
      data: {
        apiKeyId: input.apiKeyId,
        outcome: input.outcome,
        reason: input.reason ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        action: input.action ?? null,
      },
    });
    // Trim asynchronously; ignore failures.
    void trimAttemptLog(input.apiKeyId);
  } catch {
    /* ignore */
  }
}

async function trimAttemptLog(apiKeyId: string) {
  try {
    const total = await prisma.apiKeyAttemptLog.count({ where: { apiKeyId } });
    if (total <= ATTEMPT_LOG_RETENTION) return;
    const toDelete = await prisma.apiKeyAttemptLog.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: 'asc' },
      take: total - ATTEMPT_LOG_RETENTION,
      select: { id: true },
    });
    if (toDelete.length === 0) return;
    await prisma.apiKeyAttemptLog.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
  } catch {
    /* ignore */
  }
}
