/**
 * Webhook security helpers — HMAC signing + SSRF-safe URL validation.
 */
import crypto from 'crypto';
import { isPrivateIp, normalizeIp } from '@/lib/ip-utils';

/** Generate a signing secret (shown to the reseller once). */
export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(24).toString('hex');
}

/**
 * Compute the signature header value for a payload body.
 * Format: "t=<unixSeconds>,v1=<hex hmac of `t.body`>"  (Stripe-style).
 * The receiver recomputes HMAC-SHA256 over `${t}.${rawBody}` with the
 * shared secret and compares v1.
 */
export function signPayload(rawBody: string, secret: string, timestampSec?: number): string {
  const t = timestampSec ?? Math.floor(Date.now() / 1000);
  const mac = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${mac}`;
}

/**
 * Validate a reseller-supplied URL before we ever fetch it.
 *  - HTTPS only (allow HTTP for localhost in dev for testing)
 *  - No private / loopback / link-local hosts (SSRF guard)
 *  - No raw IP literals that resolve to private ranges
 *
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateWebhookUrl(rawUrl: string): { ok: true } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const host = url.hostname.toLowerCase();
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

  if (url.protocol !== 'https:') {
    // Allow http only for localhost in development (for local testing).
    if (!(isDev && url.protocol === 'http:' && isLocalhost)) {
      return { ok: false, reason: 'Only HTTPS URLs are allowed' };
    }
  }

  // Block obvious internal hostnames.
  if (!isDev && isLocalhost) {
    return { ok: false, reason: 'Localhost URLs are not allowed' };
  }
  if (
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === 'metadata.google.internal'
  ) {
    return { ok: false, reason: 'Internal hostnames are not allowed' };
  }

  // If the host is a raw IP literal, block private ranges.
  const asIp = normalizeIp(host);
  if (asIp && isPrivateIp(asIp) && !(isDev && isLocalhost)) {
    return { ok: false, reason: 'Private/internal IP addresses are not allowed' };
  }

  // Block cloud metadata IP explicitly.
  if (asIp === '169.254.169.254') {
    return { ok: false, reason: 'Metadata IP is not allowed' };
  }

  return { ok: true };
}
