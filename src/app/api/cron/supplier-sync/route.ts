import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { validateCronSecret } from '@/lib/cron-auth';
import { prisma } from '@/lib/db';
import { runSupplierSync } from '@/lib/supplier-sync/run-sync';

export const dynamic = 'force-dynamic';

async function handle(req: Request) {
  const cronAuth = validateCronSecret(req);
  if (cronAuth) return cronAuth;

  try {
    const apis = await prisma.imeiApi.findMany({
      where: { syncScheduleEnabled: true, status: 'ACTIVE' },
      select: { id: true },
    });

    const results = [];
    for (const api of apis) {
      results.push({ apiId: api.id, ...(await runSupplierSync(api.id, 'cron')) });
    }

    return apiSuccess({ ran: results.length, results });
  } catch (e) {
    console.error('[CRON_SUPPLIER_SYNC]', e);
    return apiError('Cron run failed', 500);
  }
}

export const GET = handle;
export const POST = handle;
