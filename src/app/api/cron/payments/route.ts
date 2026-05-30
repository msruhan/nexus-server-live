import { apiError, apiSuccess } from '@/lib/api-auth';
import { validateCronSecret } from '@/lib/cron-auth';
import { expireOldPendingIntents } from '@/lib/payment/credit';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/cron/payments
 *
 * Expire old pending payment intents. USDT Portal uses a callback-based
 * model (no polling needed). PayPal and Stripe use webhooks.
 *
 * Authorize with Bearer CRON_SECRET.
 */
async function handle(req: Request) {
  const cronAuth = validateCronSecret(req);
  if (cronAuth) return cronAuth;

  try {
    const expired = await expireOldPendingIntents();
    return apiSuccess({ expired });
  } catch (e) {
    console.error('[CRON_PAYMENTS]', e);
    return apiError('Cron run failed', 500);
  }
}

export const GET = handle;
export const POST = handle;
