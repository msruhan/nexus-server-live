import { prisma } from '@/lib/db';
import { getClientIp, ipMatchesAny, isIpv4, isIpv6, normalizeIp } from '@/lib/ip-utils';

const CACHE_TTL_MS = 30_000;

let blockCache: { patterns: string[]; loadedAt: number } | null = null;
let whitelistCache: { patterns: string[]; loadedAt: number } | null = null;
let enforceCache: { value: boolean; loadedAt: number } | null = null;

export function invalidateGlobalIpPolicyCache() {
  blockCache = null;
  whitelistCache = null;
  enforceCache = null;
}

async function getBlockedPatterns(): Promise<string[]> {
  const now = Date.now();
  if (blockCache && now - blockCache.loadedAt < CACHE_TTL_MS) {
    return blockCache.patterns;
  }
  const rows = await prisma.ipBlockEntry.findMany({ select: { ip: true } });
  const patterns = rows.map((r) => r.ip);
  blockCache = { patterns, loadedAt: now };
  return patterns;
}

async function getWhitelistPatterns(): Promise<string[]> {
  const now = Date.now();
  if (whitelistCache && now - whitelistCache.loadedAt < CACHE_TTL_MS) {
    return whitelistCache.patterns;
  }
  const rows = await prisma.ipWhitelistEntry.findMany({ select: { ip: true } });
  const patterns = rows.map((r) => r.ip);
  whitelistCache = { patterns, loadedAt: now };
  return patterns;
}

async function isWhitelistEnforced(): Promise<boolean> {
  const now = Date.now();
  if (enforceCache && now - enforceCache.loadedAt < CACHE_TTL_MS) {
    return enforceCache.value;
  }
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { apiIpWhitelistEnforced: true },
  });
  const value = settings?.apiIpWhitelistEnforced ?? false;
  enforceCache = { value, loadedAt: now };
  return value;
}

export function getClientIpFromHeaders(headerList: Headers): string | null {
  return getClientIp(new Request('http://internal.local', { headers: headerList }));
}

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const patterns = await getBlockedPatterns();
  if (patterns.length === 0) return false;
  return ipMatchesAny(ip, patterns);
}

export async function enforceGlobalApiWhitelist(
  ip: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [patterns, enforced] = await Promise.all([getWhitelistPatterns(), isWhitelistEnforced()]);

  if (!enforced && patterns.length === 0) {
    return { ok: true };
  }

  if (patterns.length === 0) {
    return {
      ok: false,
      reason:
        'API IP whitelist is enabled but no IPs are configured. Administrator must add reseller server IPs under IP management → IP Whitelist.',
    };
  }

  if (!ip) {
    return {
      ok: false,
      reason: 'Cannot determine client IP. Whitelist check requires a resolvable public IP.',
    };
  }

  if (ipMatchesAny(ip, patterns)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `IP ${ip} is not whitelisted. Register this server IP under Account → API keys → API server IP, or ask the administrator to add it under IP management.`,
  };
}

export function normalizeIpEntry(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/')) {
    const [base, bits] = trimmed.split('/');
    const normalizedBase = normalizeIp(base);
    if (!normalizedBase || !/^\d{1,3}$/.test(bits ?? '')) return null;
    const bitNum = Number(bits);
    if (!Number.isFinite(bitNum)) return null;
    if (isIpv4(normalizedBase) && bitNum >= 0 && bitNum <= 32) {
      return `${normalizedBase}/${bitNum}`;
    }
    if (isIpv6(normalizedBase) && bitNum >= 0 && bitNum <= 128) {
      return `${normalizedBase}/${bitNum}`;
    }
    return null;
  }
  return normalizeIp(trimmed);
}

export const USER_API_IP_WHITELIST_LIMIT = 1;

export async function getIpPolicyAdminSnapshot() {
  const [blocked, whitelisted, settings] = await Promise.all([
    prisma.ipBlockEntry.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.ipWhitelistEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { apiIpWhitelistEnforced: true },
    }),
  ]);
  return {
    blocked,
    whitelisted,
    apiIpWhitelistEnforced: settings?.apiIpWhitelistEnforced ?? false,
  };
}
