/**
 * API guards for license runtime / updates entitlements.
 */
import { NextResponse } from 'next/server';
import { getLicenseEnforcementState } from '@/lib/license-state';

export async function requireRuntimeLicense(): Promise<NextResponse | null> {
  const state = await getLicenseEnforcementState();
  if (!state.activated || state.runtimeAllowed) return null;
  return NextResponse.json(
    { error: 'license_inactive', reason: state.reason ?? 'runtime_denied' },
    { status: 403 },
  );
}

export async function requireUpdatesLicense(): Promise<NextResponse | null> {
  const state = await getLicenseEnforcementState();
  if (!state.activated) {
    return NextResponse.json({ error: 'license_required', reason: 'not_activated' }, { status: 403 });
  }
  if (!state.updatesAllowed) {
    return NextResponse.json(
      { error: 'updates_not_allowed', reason: state.reason ?? 'updates_denied' },
      { status: 403 },
    );
  }
  return null;
}
