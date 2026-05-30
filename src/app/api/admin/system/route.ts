/**
 * GET /api/admin/system — System info + license status
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { getCurrentVersion } from '@/lib/license/client';

export const dynamic = 'force-dynamic';

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'manageSystem');
    if (!allowed) return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      licenseKey: true,
      licenseStatus: true,
      licenseDomain: true,
      licensePlan: true,
      licenseExpiresAt: true,
      licenseLastValidated: true,
      licenseReason: true,
      lastUpdateVersion: true,
      lastUpdateAt: true,
    },
  });

  const recentUpdates = await prisma.updateLog.findMany({
    orderBy: { appliedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      fromVersion: true,
      toVersion: true,
      status: true,
      error: true,
      appliedAt: true,
      durationSeconds: true,
    },
  });

  return NextResponse.json({
    currentVersion: getCurrentVersion(),
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.round(process.uptime()),
    license: {
      status: settings?.licenseStatus ?? 'not_activated',
      key: settings?.licenseKey ? '••••••' + settings.licenseKey.slice(-8) : null,
      domain: settings?.licenseDomain ?? null,
      plan: settings?.licensePlan ?? null,
      expiresAt: settings?.licenseExpiresAt?.toISOString() ?? null,
      lastValidatedAt: settings?.licenseLastValidated?.toISOString() ?? null,
      reason: settings?.licenseReason ?? null,
    },
    lastUpdate: {
      version: settings?.lastUpdateVersion ?? null,
      at: settings?.lastUpdateAt?.toISOString() ?? null,
    },
    updateHistory: recentUpdates,
  });
}
