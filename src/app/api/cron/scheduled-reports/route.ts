import { apiError, apiSuccess } from '@/lib/api-auth';
import { validateCronSecret } from '@/lib/cron-auth';
import { runScheduledReportEmail } from '@/lib/reports/scheduled-email';

export const dynamic = 'force-dynamic';

async function handle(req: Request) {
  const cronAuth = validateCronSecret(req);
  if (cronAuth) return cronAuth;
  try {
    const result = await runScheduledReportEmail();
    return apiSuccess(result);
  } catch (e) {
    console.error('[CRON_SCHEDULED_REPORTS]', e);
    return apiError('Cron run failed', 500);
  }
}

export const GET = handle;
export const POST = handle;
