import { isPrismaMissingTableError } from '@/lib/db-schema-ready';
import { prisma } from '@/lib/db';
import { runSupplierSync } from './run-sync';

const TICK_MS = 15 * 60 * 1000;

const globalForScheduler = globalThis as typeof globalThis & {
  __supplierSyncSchedulerStarted?: boolean;
  __supplierSyncSchedulerRunning?: boolean;
  __supplierSyncSchedulerMissingDbWarned?: boolean;
};

async function tick(): Promise<void> {
  if (globalForScheduler.__supplierSyncSchedulerRunning) return;
  globalForScheduler.__supplierSyncSchedulerRunning = true;
  try {
    const now = new Date();
    const apis = await prisma.imeiApi.findMany({
      where: { syncScheduleEnabled: true, status: 'ACTIVE' },
      select: { id: true, syncIntervalHours: true, lastSyncAt: true },
    });

    for (const api of apis) {
      const intervalMs = Math.max(1, api.syncIntervalHours ?? 24) * 60 * 60 * 1000;
      const due =
        !api.lastSyncAt || api.lastSyncAt.getTime() + intervalMs <= now.getTime();
      if (!due) continue;

      const result = await runSupplierSync(api.id, 'scheduled');
      if (!result.ok) {
        console.warn(`[SUPPLIER_SYNC_SCHEDULER] ${api.id}: ${result.error}`);
      }
    }
  } catch (e) {
    if (isPrismaMissingTableError(e)) {
      if (!globalForScheduler.__supplierSyncSchedulerMissingDbWarned) {
        globalForScheduler.__supplierSyncSchedulerMissingDbWarned = true;
        console.warn('[SUPPLIER_SYNC_SCHEDULER] Tables missing — run npm run db:setup');
      }
      return;
    }
    console.error('[SUPPLIER_SYNC_SCHEDULER] tick error:', e);
  } finally {
    globalForScheduler.__supplierSyncSchedulerRunning = false;
  }
}

export function startSupplierSyncScheduler(): void {
  if (process.env.SUPPLIER_SYNC_SCHEDULER_ENABLED === 'false') {
    console.log('[SUPPLIER_SYNC_SCHEDULER] Disabled via SUPPLIER_SYNC_SCHEDULER_ENABLED=false');
    return;
  }
  if (globalForScheduler.__supplierSyncSchedulerStarted) return;
  globalForScheduler.__supplierSyncSchedulerStarted = true;

  console.log('[SUPPLIER_SYNC_SCHEDULER] Active — checking every 15m');
  setTimeout(() => void tick(), 45_000);
  setInterval(() => void tick(), TICK_MS);
}
