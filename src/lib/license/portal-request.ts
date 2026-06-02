/**
 * Signed HTTP requests to NexusPortal license/update APIs.
 *
 * Must use the same LICENSE_API_SIGNING_SECRET as the portal.
 * @see NexusPortal docs/LICENSE_API.md
 */
import { createHmac } from 'crypto';

export const TIMESTAMP_HEADER = 'x-nexus-timestamp';
export const SIGNATURE_HEADER = 'x-nexus-signature';

const DEFAULT_TIMEOUT_MS = 30_000;

export function getLicenseServerUrl(): string {
  return (process.env.NEXUS_LICENSE_SERVER_URL ?? '').replace(/\/$/, '');
}

/** Hostname bound to the license (from NEXT_PUBLIC_APP_URL / AUTH_URL). */
export function getAppDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url
      .replace(/https?:\/\//, '')
      .replace(/[:/].*/, '')
      .toLowerCase();
  }
}

/** Prefer stored license domain; fall back to app URL hostname. */
export function resolveLicenseDomain(stored?: string | null): string | null {
  const raw = (stored?.trim() || getAppDomain()).toLowerCase();
  if (!raw) return null;
  const host = raw.replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0] ?? '';
  return host || null;
}

function signingSecret(): string | undefined {
  return process.env.LICENSE_API_SIGNING_SECRET?.trim() || undefined;
}

function signingRequired(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return !!signingSecret();
}

export function buildSignedHeaders(rawBody: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = signingSecret();
  if (!secret) {
    if (signingRequired()) {
      throw new Error('LICENSE_API_SIGNING_SECRET is required (must match NexusPortal)');
    }
    return headers;
  }
  const ts = String(Date.now());
  const sig = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  headers[TIMESTAMP_HEADER] = ts;
  headers[SIGNATURE_HEADER] = sig;
  return headers;
}

export async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST JSON to a portal API path or absolute download URL.
 */
export async function portalPost(
  urlOrPath: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const baseUrl = getLicenseServerUrl();
  if (!baseUrl && !urlOrPath.startsWith('http')) {
    throw new Error('NEXUS_LICENSE_SERVER_URL not configured');
  }

  const url = urlOrPath.startsWith('http')
    ? urlOrPath
    : `${baseUrl}${urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`}`;

  const raw = JSON.stringify(body);
  const headers = buildSignedHeaders(raw);

  return fetchWithTimeout(
    url,
    { method: 'POST', headers, body: raw },
    timeoutMs,
  );
}
