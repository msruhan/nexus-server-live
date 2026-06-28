import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { resetTransporter, verifySmtp, sendEmail } from '@/lib/email/mailer';
import { ALL_EMAIL_EVENTS, EMAIL_EVENT_GROUPS } from '@/lib/email/types';
import { logActivity } from '@/lib/activity';
import { getBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS = {
  smtpEnabled: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUsername: true,
  smtpFromAddress: true,
  smtpFromName: true,
  smtpEvents: true,
} as const;

const updateSchema = z.object({
  smtpEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().max(200).optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpUsername: z.string().trim().max(200).optional().nullable(),
  smtpPassword: z.string().optional().nullable(), // empty = keep existing
  smtpFromAddress: z.string().email().max(200).optional().nullable(),
  smtpFromName: z.string().trim().max(200).optional().nullable(),
  smtpEvents: z.string().trim().max(2000).optional().nullable(),
});

export async function GET() {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: PUBLIC_FIELDS,
  });
  return apiSuccess({
    settings: row,
    availableEvents: ALL_EMAIL_EVENTS,
    eventGroups: EMAIL_EVENT_GROUPS,
  });
}

export async function PUT(req: Request) {
  const { error, session } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const data: Record<string, unknown> = { ...parsed.data };
  // Drop empty password — empty means "keep what you already have".
  if (data.smtpPassword === '' || data.smtpPassword === null || data.smtpPassword === undefined) {
    delete data.smtpPassword;
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  // Force the mailer to re-read settings on its next send.
  resetTransporter();

  await logActivity({
    userId: session.user.id,
    action: 'site.email_settings_updated',
    entity: 'SiteSettings',
    metadata: { changed: Object.keys(parsed.data) },
  });

  return apiSuccess({ ok: true });
}

const verifySchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().optional().default(''),
  pass: z.string().optional().default(''),
});

export async function PATCH(req: Request) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  // PATCH = "test connection". Body provides credentials inline so admin
  // can verify before saving. We never persist what's sent here.
  const body = await req.json();
  if (body?.action === 'verify') {
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');
    const result = await verifySmtp(parsed.data);
    return result.ok ? apiSuccess({ ok: true }) : apiError(result.error ?? 'verify_failed');
  }

  if (body?.action === 'test_send') {
    const to = String(body.to ?? '').trim();
    if (!to) return apiError('Recipient required');
    const brand = await getBranding();
    const result = await sendEmail({
      to,
      subject: `${brand.siteName} — SMTP test`,
      text: 'This is a test email. If you can read this, your SMTP settings work.',
      html:
        `<p>This is a test email. If you can read this, your SMTP settings work. — <em>${brand.siteName}</em></p>`,
      event: 'auth.password_changed', // any event OK; we whitelist 'auth.password_changed' by default
    });
    return result.ok ? apiSuccess({ ok: true, logId: result.logId }) : apiError(result.reason ?? 'send_failed');
  }

  return apiError('Unknown action', 400);
}
