/**
 * GET /api/admin/system/update-progress — Poll update progress
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/sub-admin';
import {
  getDockerUpdateProgress,
  isDockerUpdateInProgress,
  resolveUpdateProgressForPoll,
} from '@/lib/license/docker-updater';
import { getUpdateProgress, isUpdateInProgress } from '@/lib/license/updater';
import type { UpdateProgress } from '@/lib/license/types';

export const dynamic = 'force-dynamic';

const WAIT_MESSAGE = 'Update in progress, please wait…';

function publicUpdateProgress(progress: UpdateProgress) {
  if (progress.phase === 'done') {
    return { phase: 'done' as const, percent: 100, message: 'Update completed successfully.' };
  }
  if (progress.phase === 'failed') {
    return { phase: 'failed' as const, percent: 0, message: 'Update failed.', error: 'Update failed. Please try again later.' };
  }
  if (progress.phase === 'idle') {
    return { phase: 'idle' as const, percent: 0, message: 'No update in progress' };
  }
  return { phase: progress.phase, percent: progress.percent, message: WAIT_MESSAGE };
}

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

  if (isDockerUpdateInProgress() || getDockerUpdateProgress().phase !== 'idle') {
    const dockerProgress = isDockerUpdateInProgress()
      ? getDockerUpdateProgress()
      : await resolveUpdateProgressForPoll();
    return NextResponse.json(publicUpdateProgress(dockerProgress));
  }

  if (isUpdateInProgress()) {
    return NextResponse.json(publicUpdateProgress(getUpdateProgress()));
  }

  const resolved = await resolveUpdateProgressForPoll();
  return NextResponse.json(publicUpdateProgress(resolved));
}
