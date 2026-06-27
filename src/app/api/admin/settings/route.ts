import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { resetBrandingCache } from '@/lib/branding';

const schema = z.object({
  siteName: z.string().optional(),
  siteTagline: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  supportEmail: z.string().optional().nullable(),
  adminNotificationEmail: z.string().max(200).optional().nullable(),
  brandShowPoweredBy: z.boolean().optional(),
  brandInvoicePrefix: z.string().optional().nullable(),
  copyrightText: z.string().optional().nullable(),
  enableRegistration: z.boolean().optional(),
  registrationActivationMode: z.enum(['AUTO', 'MANUAL', 'EMAIL']).optional(),
  enableDirectPayment: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  enforceAdmin2FA: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialWhatsapp: z.string().optional(),
  socialTelegram: z.string().optional(),
  footerText: z.string().optional(),
});

export async function PUT(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const data = { ...parsed.data };
  if (typeof data.adminNotificationEmail === 'string') {
    const trimmed = data.adminNotificationEmail.trim();
    data.adminNotificationEmail = trimmed === '' ? null : trimmed;
    if (data.adminNotificationEmail && !z.string().email().safeParse(data.adminNotificationEmail).success) {
      return NextResponse.json({ error: 'Invalid admin notification email' }, { status: 400 });
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  resetBrandingCache();

  await logActivity({
    userId: session?.user.id,
    action: 'site.settings_updated',
    entity: 'SiteSettings',
  });

  return NextResponse.json({ ok: true });
}
