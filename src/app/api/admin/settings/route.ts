import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

const schema = z.object({
  siteName: z.string().optional(),
  siteTagline: z.string().optional(),
  primaryColor: z.string().optional(),
  enableRegistration: z.boolean().optional(),
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

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: parsed.data,
    create: { id: 'singleton', ...parsed.data },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'site.settings_updated',
    entity: 'SiteSettings',
  });

  return NextResponse.json({ ok: true });
}
