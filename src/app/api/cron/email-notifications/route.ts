import { apiError, apiSuccess } from '@/lib/api-auth';
import { validateCronSecret } from '@/lib/cron-auth';
import { dispatchOrderEmails } from '@/lib/email/order-notifier';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/email-notifications
 *
 * Scans recently-completed orders and dispatches the success/rejected
 * email if not yet sent. Idempotent — safe to call as often as you like.
 *
 * Run alongside the existing IMEI/server cron, on a separate schedule
 * (e.g. every 5 minutes).
 */
async function handle(req: Request) {
  const cronAuth = validateCronSecret(req);
  if (cronAuth) return cronAuth;
  try {
    const counts = await dispatchOrderEmails();
    return apiSuccess(counts);
  } catch (e) {
    console.error('[CRON_EMAIL_NOTIFY]', e);
    return apiError('Cron run failed', 500);
  }
}

export const GET = handle;
export const POST = handle;
