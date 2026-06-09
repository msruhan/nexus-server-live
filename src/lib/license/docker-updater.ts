import * as fs from 'fs';
import { prisma } from '@/lib/db';
import { getAppVersion } from '@/lib/app-version';
import { portalPost, resolveLicenseDomain } from './portal-request';
import type { UpdateProgress } from './types';

let dockerUpdateInProgress = false;
let activeJobId: string | null = null;

const PROGRESS_FILE = '/tmp/nexus-update-status.json';

function writeProgress(progress: UpdateProgress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
  } catch {
    // silent
  }
}

function clearDockerUpdateState() {
  dockerUpdateInProgress = false;
  activeJobId = null;
}

/** Drop stale in-memory lock when progress file shows a terminal state. */
function syncDockerUpdateInProgress(): boolean {
  if (!dockerUpdateInProgress) return false;
  const { phase } = getDockerUpdateProgress();
  if (phase === 'failed' || phase === 'done' || phase === 'idle') {
    clearDockerUpdateState();
    return false;
  }
  return true;
}

export function isDockerUpdateInProgress(): boolean {
  return syncDockerUpdateInProgress();
}

export function getDockerUpdateProgress(): UpdateProgress {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      return { phase: 'idle', percent: 0, message: 'No update in progress' };
    }
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as UpdateProgress;
  } catch {
    return { phase: 'idle', percent: 0, message: 'No update in progress' };
  }
}

function databaseHostFromEnv(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.replace(/^postgresql:/, 'http:')).hostname || null;
  } catch {
    return null;
  }
}

/** True for Hermes / docker-compose stacks (DB service hostname `postgres`). */
export function isComposeDockerDatabase(): boolean {
  return databaseHostFromEnv() === 'postgres';
}

export function getDeployMode(): 'docker' | 'zip' {
  const mode = (process.env.NEXUS_DEPLOY_MODE ?? '').trim().toLowerCase();
  if (mode === 'docker') return 'docker';
  if (mode === 'zip') return 'zip';
  if (isComposeDockerDatabase()) return 'docker';
  return 'zip';
}

/** Portal check hint wins when explicit; otherwise infer from env / DATABASE_URL. */
export function resolveDeployMode(portalMode?: string | null): 'docker' | 'zip' {
  const hint = (portalMode ?? '').trim().toLowerCase();
  if (hint === 'docker') return 'docker';
  if (hint === 'zip') return 'zip';
  return getDeployMode();
}

function mapPortalPhase(phase: string): UpdateProgress['phase'] {
  if (phase === 'queued') return 'downloading';
  if (phase === 'pulling') return 'restarting';
  if (phase === 'done') return 'done';
  if (phase === 'failed') return 'failed';
  return 'downloading';
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

function versionsMatch(a: string, b: string): boolean {
  return normalizeVersion(a) === normalizeVersion(b);
}

async function markDockerUpdatePending(fromVersion: string, targetVersion: string): Promise<void> {
  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      pendingUpdateFromVersion: normalizeVersion(fromVersion),
      pendingUpdateTargetVersion: normalizeVersion(targetVersion),
    },
  });
}

async function clearDockerUpdatePending(): Promise<void> {
  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      pendingUpdateFromVersion: null,
      pendingUpdateTargetVersion: null,
    },
  });
}

async function resolveFromVersionForUpdate(targetVersion: string): Promise<string> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { pendingUpdateFromVersion: true, lastUpdateVersion: true },
  });

  for (const candidate of [
    settings?.pendingUpdateFromVersion,
    settings?.lastUpdateVersion,
    getAppVersion(),
  ]) {
    if (candidate?.trim() && !versionsMatch(candidate, targetVersion)) {
      return normalizeVersion(candidate);
    }
  }

  const lastLog = await prisma.updateLog.findFirst({
    where: { status: 'success' },
    orderBy: { appliedAt: 'desc' },
    select: { toVersion: true },
  });
  if (lastLog?.toVersion && !versionsMatch(lastLog.toVersion, targetVersion)) {
    return normalizeVersion(lastLog.toVersion);
  }

  return 'initial';
}

async function recordDockerUpdateSuccess(
  targetVersion: string,
  fromVersionOverride?: string,
): Promise<void> {
  const normalizedTarget = normalizeVersion(targetVersion);
  const existing = await prisma.updateLog.findFirst({
    where: { toVersion: normalizedTarget, status: 'success' },
  });

  if (existing && getDockerUpdateProgress().phase === 'done') {
    await clearDockerUpdatePending();
    clearDockerUpdateState();
    return;
  }

  if (!existing) {
    const fromVersion = fromVersionOverride
      ? normalizeVersion(fromVersionOverride)
      : await resolveFromVersionForUpdate(normalizedTarget);
    await prisma.updateLog.create({
      data: {
        fromVersion,
        toVersion: normalizedTarget,
        status: 'success',
        durationSeconds: null,
      },
    });
  }

  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      lastUpdateVersion: normalizedTarget,
      lastUpdateAt: new Date(),
      pendingUpdateFromVersion: null,
      pendingUpdateTargetVersion: null,
    },
  });
  writeProgress({
    phase: 'done',
    percent: 100,
    message: `Updated to v${normalizedTarget} successfully.`,
  });
  clearDockerUpdateState();
}

/** Complete history when a Docker update survived container recreate (pending row in DB). */
export async function reconcileDockerUpdateHistory(): Promise<void> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      lastUpdateVersion: true,
      pendingUpdateFromVersion: true,
      pendingUpdateTargetVersion: true,
    },
  });
  if (!settings?.pendingUpdateTargetVersion) return;
  if (!versionsMatch(getAppVersion(), settings.pendingUpdateTargetVersion)) return;

  const logged = await prisma.updateLog.findFirst({
    where: { toVersion: settings.pendingUpdateTargetVersion, status: 'success' },
  });
  if (logged && versionsMatch(settings.lastUpdateVersion ?? '', settings.pendingUpdateTargetVersion)) {
    await clearDockerUpdatePending();
    return;
  }

  await recordDockerUpdateSuccess(
    settings.pendingUpdateTargetVersion,
    settings.pendingUpdateFromVersion ?? undefined,
  );
}

export async function acknowledgeDockerUpdateRecord(input: {
  targetVersion: string;
  fromVersion?: string;
}): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const target = normalizeVersion(input.targetVersion);
  if (!target) return { ok: false, error: 'invalid_target' };
  if (!versionsMatch(getAppVersion(), target)) {
    return { ok: false, error: 'version_not_installed' };
  }

  const existing = await prisma.updateLog.findFirst({
    where: { toVersion: target, status: 'success' },
  });
  await recordDockerUpdateSuccess(target, input.fromVersion);
  return { ok: true, created: !existing };
}

export async function applyDockerUpdate(targetVersion: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (dockerUpdateInProgress) {
    return { ok: false, error: 'An update is already in progress' };
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { licenseKey: true, licenseDomain: true },
  });
  if (!settings?.licenseKey) {
    return { ok: false, error: 'License required to apply updates' };
  }

  const domain = resolveLicenseDomain(settings.licenseDomain);
  if (!domain) {
    return { ok: false, error: 'License domain not configured' };
  }

  const fromVersion = getAppVersion();
  await markDockerUpdatePending(fromVersion, targetVersion);

  dockerUpdateInProgress = true;
  writeProgress({ phase: 'downloading', percent: 5, message: 'Starting remote update…' });

  try {
    const res = await portalPost('/api/update/apply', {
      key: settings.licenseKey,
      domain,
      targetVersion,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      const err = data.error ?? `Request failed (${res.status})`;
      writeProgress({ phase: 'failed', percent: 0, message: 'Update failed', error: err });
      await clearDockerUpdatePending();
      clearDockerUpdateState();
      return { ok: false, error: err };
    }

    activeJobId = data.updateJobId as string;
    writeProgress({
      phase: 'downloading',
      percent: 15,
      message: data.warning ?? 'Update queued — connecting to your server…',
    });

    void pollDockerUpdateJob(settings.licenseKey, domain, activeJobId, targetVersion);

    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : 'Unknown error';
    writeProgress({ phase: 'failed', percent: 0, message: 'Update failed', error: err });
    await clearDockerUpdatePending();
    dockerUpdateInProgress = false;
    activeJobId = null;
    return { ok: false, error: err };
  }
}

async function pollDockerUpdateJob(
  licenseKey: string,
  domain: string,
  updateJobId: string,
  targetVersion: string,
): Promise<void> {
  const deadline = Date.now() + 20 * 60_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await portalPost('/api/update/status', {
        key: licenseKey,
        domain,
        updateJobId,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) continue;

      const phase = mapPortalPhase(String(data.phase ?? data.status ?? 'queued'));
      const percent = Number(data.percent ?? 10);
      const message = String(data.message ?? 'Updating…');

      writeProgress({
        phase,
        percent,
        message,
        error: data.error ?? undefined,
      });

      // Portal job may lag or callback may fail while Hermes already recreated the container.
      const installed = versionsMatch(getAppVersion(), targetVersion);
      if (data.status === 'success' || (installed && data.status === 'running')) {
        await recordDockerUpdateSuccess(targetVersion);
        return;
      }

      if (data.status === 'failed') {
        const error = String(data.error ?? 'update_failed').slice(0, 2000);
        const fromVersion = await resolveFromVersionForUpdate(targetVersion);
        await prisma.updateLog.create({
          data: {
            fromVersion,
            toVersion: normalizeVersion(targetVersion),
            status: 'failed',
            error,
          },
        });
        writeProgress({
          phase: 'failed',
          percent: 0,
          message: 'Update failed',
          error,
        });
        await clearDockerUpdatePending();
        clearDockerUpdateState();
        return;
      }
    } catch {
      // keep polling
    }
  }

  // Keep pending* in DB when timed out — VPS may have finished; reconcile on next page load.
  writeProgress({
    phase: 'failed',
    percent: 0,
    message: 'Update timed out',
    error: 'Timed out waiting for remote update to complete',
  });
  dockerUpdateInProgress = false;
  activeJobId = null;
}
