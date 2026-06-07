import type { NextResponse } from 'next/server';

/** Short-lived hint for middleware — admin license lockdown routing. */
export const LICENSE_LOCK_COOKIE = 'nexus_license_lock';

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function licenseLockCookieValue(locked: boolean): { value: string; maxAge: number } {
  return locked ? { value: '1', maxAge: MAX_AGE_SEC } : { value: '', maxAge: 0 };
}

export function attachLicenseLockCookie(res: NextResponse, locked: boolean): NextResponse {
  const c = licenseLockCookieValue(locked);
  res.cookies.set(LICENSE_LOCK_COOKIE, c.value, { path: '/', sameSite: 'lax', maxAge: c.maxAge });
  return res;
}
