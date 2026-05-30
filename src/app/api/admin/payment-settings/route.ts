import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  paymentUsdtPortalEnabled: z.boolean().optional(),
  paymentUsdtPortalEmail: z.string().email().max(200).optional().nullable(),
  paymentUsdtPortalApiKey: z.string().trim().optional().nullable(),
  paymentUsdtPortalCallbackPassword: z.string().trim().optional().nullable(),
  paymentUsdtRate: z.number().min(0).max(100).optional().nullable(),

  paymentPaypalEnabled: z.boolean().optional(),
  paymentPaypalClientId: z.string().trim().optional().nullable(),
  paymentPaypalClientSecret: z.string().trim().optional().nullable(),
  paymentPaypalMode: z.enum(['sandbox', 'live']).optional(),
  paymentPaypalWebhookId: z.string().trim().optional().nullable(),

  paymentStripeEnabled: z.boolean().optional(),
  paymentStripeSecretKey: z.string().trim().optional().nullable(),
  paymentStripePublishableKey: z.string().trim().optional().nullable(),
  paymentStripeWebhookSecret: z.string().trim().optional().nullable(),
});

const PUBLIC_FIELDS = {
  paymentUsdtPortalEnabled: true,
  paymentUsdtPortalEmail: true,
  paymentUsdtRate: true,
  paymentPaypalEnabled: true,
  paymentPaypalClientId: true,
  paymentPaypalMode: true,
  paymentPaypalWebhookId: true,
  paymentStripeEnabled: true,
  paymentStripePublishableKey: true,
} as const;

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: PUBLIC_FIELDS,
  });
  return apiSuccess({
    ...settings,
    paymentUsdtRate: settings?.paymentUsdtRate ? Number(settings.paymentUsdtRate) : 1.0,
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const data: Record<string, unknown> = { ...parsed.data };
  // Drop secrets that arrived as null/empty — means "keep existing value".
  for (const k of [
    'paymentPaypalClientSecret',
    'paymentStripeSecretKey',
    'paymentStripeWebhookSecret',
    'paymentUsdtPortalApiKey',
    'paymentUsdtPortalCallbackPassword',
  ] as const) {
    if (data[k] === undefined || data[k] === null || data[k] === '') {
      delete data[k];
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  await logActivity({
    userId: session.user.id,
    action: 'site.payment_settings_updated',
    entity: 'SiteSettings',
    metadata: { changed: Object.keys(parsed.data) },
  });

  return apiSuccess({ ok: true });
}
