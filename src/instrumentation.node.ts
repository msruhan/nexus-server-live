/**
 * Node.js-only instrumentation — started from instrumentation.ts when NEXT_RUNTIME is nodejs.
 */
import { startImeiOrderScheduler } from '@/lib/imei-order-scheduler';
import { startServerOrderScheduler } from '@/lib/server-order-scheduler';

export function startOrderSchedulers(): void {
  startImeiOrderScheduler();
  startServerOrderScheduler();
}

startOrderSchedulers();
