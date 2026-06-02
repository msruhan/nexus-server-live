/**
 * License Server client.
 *
 * Communicates with NexusPortal (signed requests, domain binding).
 */
import { prisma } from '@/lib/db';
import { getAppVersion } from '@/lib/app-version';
import {
  getAppDomain,
  getLicenseServerUrl,
  portalPost,
  resolveLicenseDomain,
} from './portal-request';
import type { DeactivateLicenseResult, LicenseInfo, UpdateInfo } from './types';

const LICENSE_CLEAR_DATA = {
  licenseKey: null,
  licenseStatus: 'not_activated' as const,
  licenseDomain: null,
  licensePlan: null,
  licenseExpiresAt: null,
  licenseLastValidated: null,
  licenseReason: null,
};

/** Remove license fields from this installation (does not call License Server). */
export async function clearLicenseLocally(): Promise<void> {
  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: LICENSE_CLEAR_DATA,
  });
}

function shouldClearLocallyAfterRemoteFailure(status: number, message: string): boolean {
  if (status === 404) return true;
  if (status === 403) return true;
  if (status >= 500) return true;
  return /not found|invalid license/i.test(message);
}

function formatPortalError(data: { error?: string; reason?: string }, status: number): string {
  return data.error ?? data.reason ?? `Request failed (${status})`;
}

function isSigningConfigError(msg: string): boolean {
  return /LICENSE_API_SIGNING_SECRET/i.test(msg);
}

// ─── License Operations ─────────────────────────────────────────

export async function activateLicense(rawKey: string): Promise<{ ok: true; info: LicenseInfo } | { ok: false; error: string }> {
  const key = rawKey.trim();
  if (!key) return { ok: false, error: 'License key is required' };

  if (!getLicenseServerUrl()) {
    return { ok: false, error: 'License server URL not configured (NEXUS_LICENSE_SERVER_URL)' };
  }

  const domain = resolveLicenseDomain(null);
  if (!domain) {
    return { ok: false, error: 'App domain not configured (set NEXT_PUBLIC_APP_URL or AUTH_URL)' };
  }

  try {
    const res = await portalPost('/api/license/activate', { key, domain });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: formatPortalError(data, res.status) };
    }

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
    if (isSigningConfigError(msg)) return { ok: false, error: msg };
    if (msg.includes('abort')) return { ok: false, error: 'Connection timeout — License Server unreachable' };
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

export async function validateLicense(
  opts: { timeoutMs?: number } = {},
): Promise<{ ok: true; info: LicenseInfo } | { ok: false; error: string }> {
  if (!getLicenseServerUrl()) return { ok: false, error: 'License server URL not configured' };

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseDomain: true, licenseStatus: true, licenseLastValidated: true },
  });

  if (!settings?.licenseKey) {
    return { ok: false, error: 'No license key stored' };
  }

  const domain = resolveLicenseDomain(settings.licenseDomain);
  if (!domain) {
    return { ok: false, error: 'License domain not configured' };
  }

  try {
    const res = await portalPost(
      '/api/license/validate',
      { key: settings.licenseKey, domain },
      opts.timeoutMs ?? 30_000,
    );
    const data = await res.json();

    if (!res.ok || !data.ok) {
      const reason = data.reason ?? data.error ?? 'validation_failed';
      await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: { licenseStatus: 'inactive', licenseReason: reason, licenseLastValidated: new Date() },
      });
      return { ok: false, error: reason };
    }

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
        domain: settings.licenseDomain ?? domain,
        plan: data.plan ?? null,
        expiresAt: data.expiresAt ?? null,
        lastValidatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    if (isSigningConfigError(msg)) return { ok: false, error: msg };

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
    console.warn('[license] Validation failed (network), within grace period:', msg);
    return { ok: false, error: `Network error (grace period active): ${msg}` };
  }
}

export async function deactivateLicense(): Promise<DeactivateLicenseResult> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseDomain: true },
  });
  if (!settings?.licenseKey) return { ok: false, error: 'No license to deactivate' };

  const key = settings.licenseKey.trim();
  const domain = resolveLicenseDomain(settings.licenseDomain);
  const baseUrl = getLicenseServerUrl();

  if (!baseUrl) {
    await clearLicenseLocally();
    return {
      ok: true,
      remote: false,
      warning: 'License removed from this installation (license server URL not configured).',
    };
  }

  if (!domain) {
    await clearLicenseLocally();
    return {
      ok: true,
      remote: false,
      warning: 'License removed locally (domain not configured for remote deactivation).',
    };
  }

  try {
    const res = await portalPost('/api/license/deactivate', { key, domain }, 10_000);
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (res.ok && data.ok) {
      await clearLicenseLocally();
      return { ok: true, remote: true };
    }

    const errMsg = formatPortalError(data, res.status);
    if (shouldClearLocallyAfterRemoteFailure(res.status, errMsg)) {
      await clearLicenseLocally();
      return {
        ok: true,
        remote: false,
        warning: `License removed from this installation. License server: ${errMsg}`,
      };
    }

    return { ok: false, error: errMsg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await clearLicenseLocally();
    return {
      ok: true,
      remote: false,
      warning: `License removed from this installation (license server unreachable: ${msg}).`,
    };
  }
}

// ─── Update Operations ──────────────────────────────────────────

export async function checkForUpdate(): Promise<{ ok: true; info: UpdateInfo } | { ok: false; error: string }> {
  if (!getLicenseServerUrl()) return { ok: false, error: 'License server URL not configured' };

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseStatus: true, licenseDomain: true },
  });

  if (settings?.licenseStatus !== 'active' || !settings.licenseKey) {
    return { ok: false, error: 'Valid license required to check for updates' };
  }

  const domain = resolveLicenseDomain(settings.licenseDomain);
  if (!domain) {
    return { ok: false, error: 'License domain not configured' };
  }

  const currentVersion = getAppVersion();

  try {
    const res = await portalPost('/api/update/check', {
      key: settings.licenseKey,
      domain,
      currentVersion,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: formatPortalError(data, res.status) };
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
    if (isSigningConfigError(msg)) return { ok: false, error: msg };
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

export { getAppVersion as getCurrentVersion, getLicenseServerUrl, getAppDomain };

// ─── Periodic / lazy re-validation ──────────────────────────────

let revalidateInFlight: Promise<void> | null = null;

export async function revalidateIfStale(maxAgeMs = 15 * 60 * 1000): Promise<void> {
  if (revalidateInFlight) return revalidateInFlight;

  revalidateInFlight = (async () => {
    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'singleton' },
        select: { licenseKey: true, licenseStatus: true, licenseLastValidated: true },
      });

      if (!settings?.licenseKey || settings.licenseStatus === 'not_activated') return;

      const last = settings.licenseLastValidated?.getTime() ?? 0;
      if (Date.now() - last < maxAgeMs) return;

      await validateLicense({ timeoutMs: 8_000 });
    } catch (e) {
      console.warn('[license] revalidateIfStale failed:', e instanceof Error ? e.message : e);
    } finally {
      revalidateInFlight = null;
    }
  })();

  return revalidateInFlight;
}
