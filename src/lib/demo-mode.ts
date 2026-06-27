/**
 * Vercel marketing demo — display-only except palette saves.
 * Set NEXUS_DEMO_MODE=true on nexus-demo; never on customer VPS.
 */
import { NextResponse } from 'next/server';

export function isDemoMode(): boolean {
  return process.env.NEXUS_DEMO_MODE === 'true';
}

export function isDemoModePublic(): boolean {
  return process.env.NEXT_PUBLIC_NEXUS_DEMO_MODE === 'true';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** True when a mutating API request is allowed in demo mode. */
export function isDemoMutationAllowed(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  if (SAFE_METHODS.has(m)) return true;

  if (pathname === '/api/auth/register') return false;

  if (pathname === '/api/auth/check-login' && m === 'POST') return true;
  if (pathname === '/api/user/palette' && m === 'PUT') return true;

  // NextAuth session / sign-in / sign-out (not custom register route).
  if (pathname.startsWith('/api/auth/')) return true;

  return false;
}

export function demoModeBlockedResponse(): NextResponse {
  return NextResponse.json({ error: 'demo_mode_read_only' }, { status: 403 });
}

/** Call at the top of sensitive handlers for defense in depth. */
export function assertNotDemoMode(): NextResponse | null {
  if (isDemoMode()) return demoModeBlockedResponse();
  return null;
}
