/**
 * Lightweight in-memory login throttle.
 *
 * Goal: stop credential stuffing & brute force without adding infra (Redis).
 * For production scale, replace with a Redis-backed counter — but this is
 * good enough for self-hosted / single-instance deployments which is the
 * dominant pattern for this codebase.
 *
 * Strategy:
 *   - Track failed attempts per (ip + email) and per ip.
 *   - After N failures, return "throttled" with retry-after seconds.
 *   - Successful auth resets counters.
 *
 * Used by /api/auth/check-login (the pre-flight) and the NextAuth credentials
 * authorize() callback. The Credentials provider returns null on bad creds —
 * we cannot easily plumb a 429 from it, but the pre-flight catches abuse early.
 */

type Bucket = {
  fails: number;
  resetAt: number;
  lockedUntil: number;
};

const PER_IP_EMAIL_LIMIT = 5;
const PER_IP_LIMIT = 30;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCK_AFTER_LIMIT_MS = 15 * 60 * 1000; // 15 minutes lockout

const ipEmailBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

function get(map: Map<string, Bucket>, key: string): Bucket {
  let b = map.get(key);
  const t = now();
  if (!b || b.resetAt < t) {
    b = { fails: 0, resetAt: t + WINDOW_MS, lockedUntil: 0 };
    map.set(key, b);
  }
  return b;
}

export type ThrottleResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; reason: 'EMAIL_LOCKED' | 'IP_LOCKED' };

/**
 * Check whether a login attempt should be allowed. Call BEFORE attempting
 * password verification. If returns ok=false, do not even hash compare —
 * just bounce the request with the suggested retry-after.
 */
export function checkLoginAllowed(ip: string, email: string): ThrottleResult {
  const t = now();
  const ipKey = `ip:${ip}`;
  const emailKey = `ip+email:${ip}|${email.toLowerCase()}`;
  const ipBucket = get(ipBuckets, ipKey);
  const emailBucket = get(ipEmailBuckets, emailKey);

  if (emailBucket.lockedUntil > t) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((emailBucket.lockedUntil - t) / 1000),
      reason: 'EMAIL_LOCKED',
    };
  }
  if (ipBucket.lockedUntil > t) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((ipBucket.lockedUntil - t) / 1000),
      reason: 'IP_LOCKED',
    };
  }
  return { ok: true };
}

export function recordLoginFailure(ip: string, email: string): void {
  const t = now();
  const ipBucket = get(ipBuckets, `ip:${ip}`);
  const emailBucket = get(ipEmailBuckets, `ip+email:${ip}|${email.toLowerCase()}`);
  emailBucket.fails += 1;
  ipBucket.fails += 1;
  if (emailBucket.fails >= PER_IP_EMAIL_LIMIT) {
    emailBucket.lockedUntil = t + LOCK_AFTER_LIMIT_MS;
  }
  if (ipBucket.fails >= PER_IP_LIMIT) {
    ipBucket.lockedUntil = t + LOCK_AFTER_LIMIT_MS;
  }
}

export function recordLoginSuccess(ip: string, email: string): void {
  ipEmailBuckets.delete(`ip+email:${ip}|${email.toLowerCase()}`);
  ipBuckets.delete(`ip:${ip}`);
}

// Periodic sweep to bound memory across long uptimes.
let lastSweep = now();
export function sweepLoginThrottleIfNeeded(): void {
  const t = now();
  if (t - lastSweep < WINDOW_MS) return;
  lastSweep = t;
  for (const [k, v] of ipEmailBuckets) if (v.resetAt < t && v.lockedUntil < t) ipEmailBuckets.delete(k);
  for (const [k, v] of ipBuckets) if (v.resetAt < t && v.lockedUntil < t) ipBuckets.delete(k);
}
