/**
 * POST /api/admin/system/update-apply — Start the update process
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { applyUpdate, isUpdateInProgress } from '@/lib/license/updater';
import { requireUpdatesLicense } from '@/lib/license-guard';

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

export async function POST(req: NextRequest) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (isUpdateInProgress()) {
    return NextResponse.json({ error: 'An update is already in progress' }, { status: 409 });
  }

  const body = await req.json();
  const { targetVersion, downloadUrl, checksum } = body;

  if (!targetVersion || !downloadUrl) {
    return NextResponse.json({ error: 'targetVersion and downloadUrl required' }, { status: 400 });
  }

  const updatesDenied = await requireUpdatesLicense();
  if (updatesDenied) return updatesDenied;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseStatus: true, licenseDomain: true },
  });
  if (!settings?.licenseKey) {
    return NextResponse.json({ error: 'License required to apply updates' }, { status: 403 });
  }

  // Fire-and-forget — the update runs in background
  void applyUpdate({
    downloadUrl,
    targetVersion,
    checksum: checksum ?? null,
    licenseKey: settings.licenseKey,
    licenseDomain: settings.licenseDomain,
  });

  return NextResponse.json({ ok: true, message: 'Update started' });
}
