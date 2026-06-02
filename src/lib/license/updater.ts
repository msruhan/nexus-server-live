/**
 * Update Manager — handles download, extract, build, restart.
 *
 * The entire update process runs server-side. Progress is written to
 * a JSON file that the admin UI polls via GET /api/admin/system/update-progress.
 *
 * Design:
 *   - Download ZIP from License Server (stream)
 *   - Verify SHA-256 checksum
 *   - Backup current files
 *   - Extract ZIP (overwrite project, skip .env and DB files)
 *   - npm install
 *   - prisma generate + db push
 *   - next build
 *   - Restart via configured command
 *   - Rollback on failure
 */
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getCurrentVersion } from './client';
import { portalPost, resolveLicenseDomain } from './portal-request';
import type { UpdateProgress } from './types';

const execAsync = promisify(execCb);

const PROGRESS_FILE = '/tmp/nexus-update-status.json';
const UPDATE_DIR = '/tmp/nexus-update';
const BACKUP_FILE = '/tmp/nexus-backup.tar.gz';

let updateInProgress = false;

function getProjectRoot(): string {
  return process.cwd();
}

function getRestartCommand(): string {
  return process.env.NEXUS_RESTART_COMMAND ?? 'pm2 restart nexus-server';
}

function writeProgress(progress: UpdateProgress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
  } catch {
    // silent
  }
}

export function getUpdateProgress(): UpdateProgress {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      return { phase: 'idle', percent: 0, message: 'No update in progress' };
    }
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    return JSON.parse(raw) as UpdateProgress;
  } catch {
    return { phase: 'idle', percent: 0, message: 'No update in progress' };
  }
}

export function isUpdateInProgress(): boolean {
  return updateInProgress;
}

/**
 * Execute the full update process. Runs in background (fire-and-forget).
 * The caller should return immediately after calling this.
 */
export async function applyUpdate(input: {
  downloadUrl: string;
  targetVersion: string;
  checksum: string | null;
  licenseKey: string;
  licenseDomain: string | null;
}): Promise<void> {
  if (updateInProgress) return;
  updateInProgress = true;

  const startTime = Date.now();
  const fromVersion = getCurrentVersion();
  const projectRoot = getProjectRoot();

  try {
    // Phase 1: Download
    writeProgress({ phase: 'downloading', percent: 10, message: 'Downloading update package...' });
    const zipPath = path.join(UPDATE_DIR, `nexus-${input.targetVersion}.zip`);
    fs.mkdirSync(UPDATE_DIR, { recursive: true });

    const domain = resolveLicenseDomain(input.licenseDomain);
    if (!domain) throw new Error('License domain not configured');

    const res = await portalPost(
      input.downloadUrl,
      { key: input.licenseKey, domain },
      120_000,
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = (errBody as { error?: string }).error ?? `HTTP ${res.status}`;
      throw new Error(`Download failed: ${msg}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(zipPath, buffer);

    // Phase 2: Verify checksum
    writeProgress({ phase: 'extracting', percent: 25, message: 'Verifying package integrity...' });
    if (input.checksum) {
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      if (hash !== input.checksum) {
        throw new Error('Checksum mismatch — package may be corrupted');
      }
    }

    // Phase 3: Backup
    writeProgress({ phase: 'extracting', percent: 30, message: 'Creating backup...' });
    await execAsync(
      `tar -czf ${BACKUP_FILE} --exclude='node_modules' --exclude='.next' --exclude='prisma/*.db' -C ${projectRoot} .`,
      { timeout: 60_000 },
    );

    // Phase 4: Extract
    writeProgress({ phase: 'extracting', percent: 40, message: 'Extracting update files...' });
    await execAsync(`unzip -o ${zipPath} -d ${projectRoot} -x '.env' 'prisma/*.db'`, {
      timeout: 60_000,
    });

    // Phase 5: Install dependencies
    writeProgress({ phase: 'installing', percent: 50, message: 'Installing dependencies...' });
    await execAsync('npm install --production --legacy-peer-deps', {
      cwd: projectRoot,
      timeout: 180_000,
    });

    // Phase 6: Prisma
    writeProgress({ phase: 'migrating', percent: 65, message: 'Running database migrations...' });
    await execAsync('npx prisma generate', { cwd: projectRoot, timeout: 30_000 });
    await execAsync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: projectRoot,
      timeout: 60_000,
    });

    // Phase 7: Build
    writeProgress({ phase: 'building', percent: 75, message: 'Building application...' });
    await execAsync('npm run build', { cwd: projectRoot, timeout: 300_000 });

    // Phase 8: Record success
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    await prisma.updateLog.create({
      data: {
        fromVersion,
        toVersion: input.targetVersion,
        status: 'success',
        durationSeconds,
      },
    });
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { lastUpdateVersion: input.targetVersion, lastUpdateAt: new Date() },
    });

    // Phase 9: Restart
    writeProgress({ phase: 'restarting', percent: 95, message: 'Restarting application...' });
    const restartCmd = getRestartCommand();
    try {
      await execAsync(restartCmd, { timeout: 15_000 });
    } catch {
      // Restart command may kill this process — that's expected
    }

    writeProgress({ phase: 'done', percent: 100, message: `Updated to v${input.targetVersion} successfully!` });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    writeProgress({ phase: 'failed', percent: 0, message: 'Update failed', error });

    // Attempt rollback
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        await execAsync(`tar -xzf ${BACKUP_FILE} -C ${projectRoot}`, { timeout: 60_000 });
        await execAsync('npm install --production --legacy-peer-deps', { cwd: projectRoot, timeout: 180_000 });
        await execAsync('npx prisma generate', { cwd: projectRoot, timeout: 30_000 });
        await execAsync('npm run build', { cwd: projectRoot, timeout: 300_000 });
      }
    } catch (rollbackErr) {
      console.error('[updater] Rollback also failed:', rollbackErr);
    }

    // Record failure
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    await prisma.updateLog.create({
      data: {
        fromVersion,
        toVersion: input.targetVersion,
        status: 'failed',
        error: error.slice(0, 2000),
        durationSeconds,
      },
    }).catch(() => {});
  } finally {
    updateInProgress = false;
    // Cleanup
    try {
      if (fs.existsSync(UPDATE_DIR)) fs.rmSync(UPDATE_DIR, { recursive: true });
    } catch { /* silent */ }
  }
}
