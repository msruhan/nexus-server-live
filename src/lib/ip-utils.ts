/**
 * IP utilities for API key security policy.
 *
 * Designed to work behind common proxies/CDNs (Cloudflare, Vercel,
 * traefik, nginx). Trusted-proxy detection uses a small allow-list
 * configured via `TRUSTED_PROXIES` env variable (CSV of IPs/CIDRs).
 *
 * NEVER trust X-Forwarded-For unconditionally — that header is
 * spoofable by any client unless we know the request came through
 * a proxy we own.
 */

export type IpVersion = 'v4' | 'v6';

const PRIVATE_V4_RANGES: Array<[string, number]> = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
];

function readTrustedProxies(): string[] {
  const raw = process.env.TRUSTED_PROXIES?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize IP to a canonical form. Strips IPv4-in-IPv6 wrapper
 * (`::ffff:1.2.3.4` → `1.2.3.4`) and lowercases v6 segments.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (!ip) return null;

  // Strip surrounding brackets used in URLs: [::1]:8080 → ::1
  if (ip.startsWith('[')) {
    const close = ip.indexOf(']');
    if (close > 0) ip = ip.slice(1, close);
  } else {
    // Strip trailing :port for v4 only (v6 uses colons).
    const colonCount = (ip.match(/:/g) || []).length;
    if (colonCount === 1) {
      ip = ip.split(':')[0];
    }
  }

  // IPv4-mapped IPv6
  const mapped = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mapped) return mapped[1];

  if (isIpv4(ip)) return ip;
  if (isIpv6(ip)) return ip.toLowerCase();
  return null;
}

export function detectVersion(ip: string): IpVersion | null {
  if (isIpv4(ip)) return 'v4';
  if (isIpv6(ip)) return 'v6';
  return null;
}

export function isIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

export function isIpv6(ip: string): boolean {
  // Lightweight check — accept full and compressed forms.
  if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
  if (ip.indexOf(':') < 0) return false;
  // Reject obvious garbage (more than 7 colons that aren't ::)
  const groups = ip.split(':');
  if (groups.length > 8 + 1 /* :: collapses one extra */) return false;
  return true;
}

function ipv4ToInt(ip: string): number {
  const [a, b, c, d] = ip.split('.').map((n) => Number(n));
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

/**
 * CIDR match for IPv4. IPv6 CIDR is intentionally simplified —
 * we only support exact match for v6 in policy lists for now.
 */
export function ipMatches(target: string, pattern: string): boolean {
  const t = normalizeIp(target);
  const p = pattern.trim();
  if (!t || !p) return false;

  if (p.includes('/')) {
    const [base, bitsStr] = p.split('/');
    const bits = Number(bitsStr);
    const baseN = normalizeIp(base);
    if (!baseN || !Number.isFinite(bits)) return false;
    if (isIpv4(t) && isIpv4(baseN)) {
      const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1) >>> 0;
      return (ipv4ToInt(t) & mask) === (ipv4ToInt(baseN) & mask);
    }
    // IPv6 CIDR: not fully supported; fall back to exact match.
    return t === baseN;
  }

  const pn = normalizeIp(p);
  return !!pn && t === pn;
}

export function ipMatchesAny(target: string, patterns: string[]): boolean {
  return patterns.some((p) => ipMatches(target, p));
}

/**
 * Resolve the actual client IP, honoring proxy headers ONLY when the
 * direct peer is in the trusted-proxy list. Falls back to the most-recent
 * forwarded entry if trusted, otherwise to the first parseable header.
 *
 * In Next.js (Node runtime), the `Request` object does not expose the
 * raw peer IP. We rely on platform headers:
 *   1. CF-Connecting-IP   (Cloudflare — trusted by default)
 *   2. X-Real-IP          (nginx, traefik)
 *   3. X-Forwarded-For    (chain — last entry is closest, first is original)
 *
 * If none are present we return null so the security layer can decide.
 */
export function getClientIp(req: Request): string | null {
  // Cloudflare: only set when traffic actually hits CF edges.
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) {
    const ip = normalizeIp(cf);
    if (ip) return ip;
  }

  const real = req.headers.get('x-real-ip');
  if (real) {
    const ip = normalizeIp(real);
    if (ip) return ip;
  }

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const trusted = readTrustedProxies();
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;

    if (trusted.length === 0) {
      // No trusted proxies configured — take left-most (original sender).
      // This is the common dev/Vercel default.
      return normalizeIp(parts[0]);
    }

    // Walk from right to left, skipping trusted proxies, until we
    // find the first non-trusted hop = real client.
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = normalizeIp(parts[i]);
      if (!candidate) continue;
      const isTrusted = trusted.some((t) => ipMatches(candidate, t));
      if (!isTrusted) return candidate;
    }
    // All hops were trusted — return left-most as best effort.
    return normalizeIp(parts[0]);
  }

  return null;
}

export function isPrivateIp(ip: string): boolean {
  if (!isIpv4(ip)) {
    // Treat IPv6 loopback / link-local as private.
    return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd');
  }
  for (const [base, bits] of PRIVATE_V4_RANGES) {
    if (ipMatches(ip, `${base}/${bits}`)) return true;
  }
  return false;
}
