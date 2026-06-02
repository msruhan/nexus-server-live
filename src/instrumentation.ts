/**
 * Runs once when the Next.js server starts.
 * Schedulers live in instrumentation.node.ts (Node only — not bundled for Edge).
 * On Vercel, prefer `/api/cron/imei-orders`; set ENABLE_BACKGROUND_JOBS=true for in-process polls.
 */

function isNextProductionBuild(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'
  );
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  if (isNextProductionBuild()) return;
  if (process.env.VERCEL === '1' && process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
    return;
  }

  const { isDbSchemaReady } = await import('@/lib/db-schema-ready');
  if (!(await isDbSchemaReady())) {
    console.warn(
      '[nexus] Database schema not ready — background schedulers skipped. Run: npm run db:setup'
    );
    return;
  }

  const { startOrderSchedulers } = await import('./instrumentation.node');
  startOrderSchedulers();
}
