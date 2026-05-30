/**
 * License Server client.
 *
 * Communicates with the external NexusPortal (License Server) to validate
 * licenses, activate keys, check for updates, and download packages.
 *
 * Design:
 *   - Raw fetch to NEXUS_LICENSE_SERVER_URL (env var)
 *   - 30-second timeout for all calls
 *   - Never throws — returns { ok, error } result objects
 *   - Settings loaded from SiteSettings (license key, domain)
 */
import { prisma } from '@/lib/db';
import { getAppVersion } from '@/lib/app-version';
import type { LicenseInfo, UpdateInfo } from './types';

const TIMEOUT_MS = 30_000;

function getLicenseServerUrl(): string {
  return (process.env.NEXUS_LICENSE_SERVER_URL ?? '').replace(/\/$/, '');
}

function getAppDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? '';
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/https?:\/\//, '').replace(/[:/].*/, '');
  }
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── License Operations ─────────────────────────────────────────

export async function activateLicense(key: string): Promise<{ ok: true; info: LicenseInfo } | { ok: false; error: string }> {
  const baseUrl = getLicenseServerUrl();
  if (!baseUrl) return { ok: false, error: 'License server URL not configured (NEXUS_LICENSE_SERVER_URL)' };

  const domain = getAppDomain();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, domain }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `Activation failed (${res.status})` };
    }

    // Store in SiteSettings
    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        licenseKey: key,
        licenseStatus: 'active',
        licenseDomain: domain,
        licensePlan: data.plan ?? null,
        licenseExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        licenseLastValidated: new Date(),
        licenseReason: null,
      },
      create: { id: 'singleton', licenseKey: key, licenseStatus: 'active', licenseDomain: domain },
    });

    return {
      ok: true,
      info: {
        status: 'active',
        key: '••••••' + key.slice(-8),
        domain,
        plan: data.plan ?? null,
        expiresAt: data.expiresAt ?? null,
        lastValidatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (msg.includes('abort')) return { ok: false, error: 'Connection timeout — License Server unreachable' };
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

export async function validateLicense(): Promise<{ ok: true; info: LicenseInfo } | { ok: false; error: string }> {
  const baseUrl = getLicenseServerUrl();
  if (!baseUrl) return { ok: false, error: 'License server URL not configured' };

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseDomain: true, licenseStatus: true, licenseLastValidated: true },
  });

  if (!settings?.licenseKey) {
    return { ok: false, error: 'No license key stored' };
  }

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: settings.licenseKey, domain: settings.licenseDomain ?? getAppDomain() }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      // License invalid/expired/revoked
      const reason = data.reason ?? data.error ?? 'validation_failed';
      await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: { licenseStatus: 'inactive', licenseReason: reason, licenseLastValidated: new Date() },
      });
      return { ok: false, error: reason };
    }

    // Valid
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        licenseStatus: 'active',
        licenseReason: null,
        licenseLastValidated: new Date(),
        licenseExpiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        licensePlan: data.plan ?? undefined,
      },
    });

    return {
      ok: true,
      info: {
        status: 'active',
        key: '••••••' + settings.licenseKey.slice(-8),
        domain: settings.licenseDomain,
        plan: data.plan ?? null,
        expiresAt: data.expiresAt ?? null,
        lastValidatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    // Network error — apply grace period logic
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const lastValidated = settings.licenseLastValidated;
    const graceDays = 7;
    if (lastValidated) {
      const daysSince = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > graceDays) {
        await prisma.siteSettings.update({
          where: { id: 'singleton' },
          data: { licenseStatus: 'inactive', licenseReason: 'grace_period_exceeded' },
        });
        return { ok: false, error: 'Grace period exceeded — License Server unreachable for 7+ days' };
      }
    }
    // Within grace period — keep current status
    console.warn('[license] Validation failed (network), within grace period:', msg);
    return { ok: false, error: `Network error (grace period active): ${msg}` };
  }
}

export async function deactivateLicense(): Promise<{ ok: true } | { ok: false; error: string }> {
  const baseUrl = getLicenseServerUrl();
  if (!baseUrl) return { ok: false, error: 'License server URL not configured' };

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseDomain: true },
  });
  if (!settings?.licenseKey) return { ok: false, error: 'No license to deactivate' };

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/license/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: settings.licenseKey, domain: settings.licenseDomain }),
    }, 10_000); // 10s timeout for deactivation

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? 'Deactivation failed' };
    }

    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        licenseKey: null,
        licenseStatus: 'not_activated',
        licenseDomain: null,
        licensePlan: null,
        licenseExpiresAt: null,
        licenseLastValidated: null,
        licenseReason: null,
      },
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

// ─── Update Operations ──────────────────────────────────────────

export async function checkForUpdate(): Promise<{ ok: true; info: UpdateInfo } | { ok: false; error: string }> {
  const baseUrl = getLicenseServerUrl();
  if (!baseUrl) return { ok: false, error: 'License server URL not configured' };

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseStatus: true, licenseDomain: true },
  });

  if (settings?.licenseStatus !== 'active' || !settings.licenseKey) {
    return { ok: false, error: 'Valid license required to check for updates' };
  }

  const currentVersion = getAppVersion();

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/update/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: settings.licenseKey,
        domain: settings.licenseDomain,
        currentVersion,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? 'Update check failed' };
    }

    const latestVersion = data.latestVersion ?? data.version ?? null;
    const available = latestVersion ? latestVersion !== currentVersion : false;

    return {
      ok: true,
      info: {
        available,
        currentVersion,
        latestVersion,
        changelog: data.changelog ?? null,
        downloadSize: data.downloadSize ?? null,
        checksum: data.checksum ?? null,
        downloadUrl: data.downloadUrl ?? null,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

export { getAppVersion as getCurrentVersion, getLicenseServerUrl, getAppDomain };
