import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { prisma } from '@/lib/db';

export type UserRole = 'ADMIN' | 'SUB_ADMIN' | 'USER';

export type ApiSession = Session & {
  user: NonNullable<Session['user']> & { id: string; role: UserRole };
};

export async function getApiSession() {
  return await auth();
}

export async function requireApiAuth(): Promise<
  { session: ApiSession; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, email: true, isActive: true },
  });

  if (!dbUser) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: 'Invalid session. Please sign in again.' },
        { status: 401 },
      ),
    };
  }

  if (!dbUser.isActive) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: 'Your account has been deactivated.' },
        { status: 403 },
      ),
    };
  }

  const { role: _existingRole, ...sessionUserRest } = session.user;
  const apiSession = {
    ...session,
    user: {
      ...sessionUserRest,
      id: dbUser.id,
      role: dbUser.role as UserRole,
      name: dbUser.name,
      email: dbUser.email ?? session.user.email ?? '',
    },
  } as ApiSession;

  return { session: apiSession, error: null };
}

export async function requireApiRole(roles: UserRole[]): Promise<
  { session: ApiSession; error: null } | { session: null; error: NextResponse }
> {
  const result = await requireApiAuth();
  if (result.error) return result;

  const userRole = result.session.user.role;
  // When roles includes 'ADMIN', we also accept 'SUB_ADMIN' since they
  // share the admin panel. Individual routes enforce granular permissions
  // via hasPermission() from @/lib/sub-admin for SUB_ADMIN users.
  const effectiveRoles: string[] = [...roles];
  if (effectiveRoles.includes('ADMIN')) effectiveRoles.push('SUB_ADMIN');

  if (!effectiveRoles.includes(userRole)) {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }

  return result;
}

/**
 * Strict ADMIN-only check. Does NOT accept SUB_ADMIN.
 * Use for sensitive operations like sub-admin management itself.
 */
export async function requireStrictAdmin(): Promise<
  { session: ApiSession; error: null } | { session: null; error: NextResponse }
> {
  const result = await requireApiAuth();
  if (result.error) return result;
  if (result.session.user.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }
  return result;
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}
