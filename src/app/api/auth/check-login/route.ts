import { compare } from 'bcryptjs';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-auth';
import { getClientIp } from '@/lib/ip-utils';
import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  sweepLoginThrottleIfNeeded,
} from '@/lib/auth/login-throttle';
import { logActivity } from '@/lib/activity';
import {
  canSignInDuringLicenseLock,
  getLicenseEnforcementState,
  isLicenseRuntimeLocked,
} from '@/lib/license-state';
import { attachLicenseLockCookie } from '@/lib/license-lock-cookie';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Pre-login check: validates credentials and reports if TOTP is required. */
export async function POST(req: Request) {
  sweepLoginThrottleIfNeeded();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('Invalid request body');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid email or password');
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = getClientIp(req) ?? 'unknown';

  const allowance = checkLoginAllowed(ip, email);
  if (!allowance.ok) {
    await logActivity({
      action: 'auth.login_throttled',
      metadata: { ip, email, reason: allowance.reason, retryAfterSec: allowance.retryAfterSec },
      ipAddress: ip,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Too many login attempts. Try again in ${Math.ceil(allowance.retryAfterSec / 60)} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(allowance.retryAfterSec) } },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isActive: true,
        twoFactorEnabled: true,
        role: true,
      },
    });

    if (!user) {
      recordLoginFailure(ip, email);
      return apiError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      // Don't increment counter on disabled accounts (might be admin action,
      // not abuse) but do log so admin sees attempts.
      await logActivity({
        userId: user.id,
        action: 'auth.login_disabled_account',
        ipAddress: ip,
      });
      return apiError('Account is disabled. Contact support.', 403);
    }

    const valid = await compare(parsed.data.password, user.password);
    if (!valid) {
      recordLoginFailure(ip, email);
      await logActivity({
        userId: user.id,
        action: 'auth.login_bad_password',
        ipAddress: ip,
      });
      return apiError('Invalid email or password', 401);
    }

    const licenseState = await getLicenseEnforcementState();
    const licenseLockdown = isLicenseRuntimeLocked(licenseState);
    if (licenseLockdown && !canSignInDuringLicenseLock(user.role)) {
      await logActivity({
        userId: user.id,
        action: 'auth.login_license_locked',
        ipAddress: ip,
      });
      return apiError(
        'The site is temporarily unavailable. Only the system administrator can sign in.',
        403,
      );
    }

    // Pre-flight passed. The actual session creation happens through
    // NextAuth credentials provider — we only reset the throttle here so
    // an honest user with a fat-fingered password earlier doesn't stay
    // locked once they finally type it right.
    recordLoginSuccess(ip, email);

    const adminLockdown =
      licenseLockdown && canSignInDuringLicenseLock(user.role);

    const res = apiSuccess({
      requires2FA: user.twoFactorEnabled,
      // Surface a forced-2FA hint for admins so the client can route to the
      // 2FA setup page instead of letting them sign in without it. This
      // only takes effect once the admin has 2FA enforced (see auth-policy).
      role: user.role,
      licenseLockdown: adminLockdown,
    });

    return attachLicenseLockCookie(res, !!adminLockdown);
  } catch (e) {
    console.error('[AUTH_CHECK_LOGIN_POST]', e);
    return apiError('Failed to verify login', 500);
  }
}
