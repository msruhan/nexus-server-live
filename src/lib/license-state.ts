/**
 * Cached license enforcement flags from the last Portal validate response.
 */
import { prisma } from '@/lib/db';

export type LicenseEnforcementState = {
  activated: boolean;
  runtimeAllowed: boolean;
  updatesAllowed: boolean;
  reason: string | null;
  portalStatus: string | null;
};

/** Paths that stay reachable while runtime is locked (admin can fix license). */
const LICENSE_LOCK_EXEMPT_PREFIXES = [
  '/license-suspended',
  '/admin/system',
  '/login',
  '/register',
  '/2fa-required',
  '/api/auth',
];

export function isLicenseLockExemptPath(pathname: string): boolean {
  const path = pathname.split('?')[0] ?? '';
  return LICENSE_LOCK_EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function getLicenseEnforcementState(): Promise<LicenseEnforcementState> {
  const s = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      licenseKey: true,
      licenseStatus: true,
      licenseRuntimeAllowed: true,
      licenseUpdatesAllowed: true,
      licenseReason: true,
      licensePortalStatus: true,
    },
  });

  const activated = !!s?.licenseKey && s.licenseStatus !== 'not_activated';

  if (!activated) {
    return {
      activated: false,
      runtimeAllowed: true,
      updatesAllowed: true,
      reason: null,
      portalStatus: null,
    };
  }

  return {
    activated: true,
    runtimeAllowed: s!.licenseRuntimeAllowed,
    updatesAllowed: s!.licenseUpdatesAllowed,
    reason: s!.licenseReason,
    portalStatus: s!.licensePortalStatus,
  };
}

/** Hard lock: redirect storefront, user desk, and admin (except license system page). */
export function shouldRedirectToLicenseSuspended(
  state: LicenseEnforcementState,
  pathname: string,
): boolean {
  if (!state.activated) return false;
  if (state.runtimeAllowed) return false;
  if (isLicenseLockExemptPath(pathname)) return false;
  return true;
}
