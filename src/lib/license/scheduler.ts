/**
 * Background scheduler: re-validate the license against the License Server
 * (NexusPortal) periodically. This is how a vendor-side revoke / expiry /
 * suspend reaches this installation without a webhook.
 *
 * Behaviour:
 *   - Runs once ~20s after boot, then every 6 hours (configurable).
 *   - Calls validateLicense(), which flips local licenseStatus to
 *     `inactive` (with a reason) when the portal reports the license is no
 *     longer valid. The admin dashboard then shows the revoked banner and
 *     blocks update actions.
 *   - No-op when no license key is stored, so unlicensed/dev installs are
 *     unaffected.
 *
 * Started from instrumentation.node.ts together with the order schedulers.
 */
import { isPrismaMissingTableError } from '@/lib/db-schema-ready';
import { prisma } from '@/lib/db';
import { validateLicense } from './client';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const globalForScheduler = globalThis as typeof globalThis & {
  __licenseSchedulerStarted?: boolean;
  __licenseSchedulerRunning?: boolean;
  __licenseSchedulerMissingDbWarned?: boolean;
};

function getIntervalMs(): number {
  const raw = process.env.LICENSE_VALIDATE_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const n = Number(raw);
  // Floor of 5 minutes to avoid hammering the portal.
  return Number.isFinite(n) && n >= 5 * 60_000 ? n : DEFAULT_INTERVAL_MS;
}

async function runTick(): Promise<void> {
  if (globalForScheduler.__licenseSchedulerRunning) return;
  globalForScheduler.__licenseSchedulerRunning = true;
  try {
    // Skip when there's nothing to validate.
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { licenseKey: true, licenseStatus: true },
    });
    if (!settings?.licenseKey || settings.licenseStatus === 'not_activated') return;

    const result = await validateLicense();
    if (!result.ok) {
      console.warn('[LICENSE_SCHEDULER] License no longer valid:', result.error);
    }
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      if (!globalForScheduler.__licenseSchedulerMissingDbWarned) {
        globalForScheduler.__licenseSchedulerMissingDbWarned = true;
        console.warn('[LICENSE_SCHEDULER] Tables missing — run npm run db:setup');
      }
      return;
    }
    console.error('[LICENSE_SCHEDULER] tick error:', e);
  } finally {
    globalForScheduler.__licenseSchedulerRunning = false;
  }
}

/** Start the global interval (once per Node process). */
export function startLicenseScheduler(): void {
  if (process.env.LICENSE_VALIDATE_SCHEDULER_ENABLED === 'false') {
    console.log('[LICENSE_SCHEDULER] Disabled via LICENSE_VALIDATE_SCHEDULER_ENABLED=false');
    return;
  }
  if (globalForScheduler.__licenseSchedulerStarted) return;
  globalForScheduler.__licenseSchedulerStarted = true;

  const intervalMs = getIntervalMs();
  console.log(`[LICENSE_SCHEDULER] Active — re-validate license every ${Math.round(intervalMs / 60_000)}m`);

  setTimeout(() => void runTick(), 20_000);
  setInterval(() => void runTick(), intervalMs);
}
