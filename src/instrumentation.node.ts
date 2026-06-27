/**
 * Node.js-only instrumentation — started from instrumentation.ts when NEXT_RUNTIME is nodejs.
 */
import { startImeiOrderScheduler } from '@/lib/imei-order-scheduler';
import { startServerOrderScheduler } from '@/lib/server-order-scheduler';
import { startWebhookScheduler } from '@/lib/webhook/scheduler';
import { startLicenseScheduler } from '@/lib/license/scheduler';
import { startLicenseBootstrap } from '@/lib/license/bootstrap';
import { startBackupScheduler } from '@/lib/backup/scheduler';
import { startSupplierSyncScheduler } from '@/lib/supplier-sync/scheduler';

export function startOrderSchedulers(): void {
  startImeiOrderScheduler();
  startServerOrderScheduler();
  startWebhookScheduler();
  startLicenseBootstrap();
  startLicenseScheduler();
  startBackupScheduler();
  startSupplierSyncScheduler();
}
