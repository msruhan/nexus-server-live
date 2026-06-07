import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { parseFooterContent } from '@/lib/footer-content';

const linkSchema = z.object({
  label: z.string().min(1).max(120),
  href: z.string().min(1).max(2048),
});

const columnSchema = z.object({
  title: z.string().min(1).max(80),
  links: z.array(linkSchema).max(12),
});

const schema = z.object({
  introText: z.string().max(2000).nullable().optional(),
  footerText: z.string().max(2000).nullable().optional(),
  siteTagline: z.string().max(200).optional(),
  copyrightText: z.string().max(500).nullable().optional(),
  brandShowPoweredBy: z.boolean().optional(),
  socialInstagram: z.string().max(500).nullable().optional(),
  socialTiktok: z.string().max(500).nullable().optional(),
  socialWhatsapp: z.string().max(500).nullable().optional(),
  socialTelegram: z.string().max(500).nullable().optional(),
  socialFacebook: z.string().max(500).nullable().optional(),
  socialYoutube: z.string().max(500).nullable().optional(),
  newsletter: z
    .object({
      enabled: z.boolean(),
      eyebrow: z.string().max(200),
      heading: z.string().max(500),
      emailPlaceholder: z.string().max(120),
      buttonLabel: z.string().max(60),
    })
    .optional(),
  linkMode: z.enum(['columns', 'menus']).optional(),
  columns: z.array(columnSchema).max(8).optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  const content = parseFooterContent(settings?.footerContent);

  return NextResponse.json({
    ok: true,
    content,
    settings: {
      siteName: settings?.siteName ?? 'Recovero',
      siteTagline: settings?.siteTagline ?? '',
      footerText: settings?.footerText ?? '',
      copyrightText: settings?.copyrightText ?? '',
      brandShowPoweredBy: settings?.brandShowPoweredBy ?? true,
      socialInstagram: settings?.socialInstagram ?? '',
      socialTiktok: settings?.socialTiktok ?? '',
      socialWhatsapp: settings?.socialWhatsapp ?? '',
      socialTelegram: settings?.socialTelegram ?? '',
      socialFacebook: settings?.socialFacebook ?? '',
      socialYoutube: settings?.socialYoutube ?? '',
    },
  });
}

export async function PUT(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid footer data' }, { status: 400 });
  }

  const body = parsed.data;
  const existing = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  const current = parseFooterContent(existing?.footerContent);

  const nextContent = {
    introText: body.introText !== undefined ? body.introText : current.introText,
    newsletter: body.newsletter ?? current.newsletter,
    linkMode: body.linkMode ?? current.linkMode,
    columns: body.columns ?? current.columns,
  };

  const footerText =
    body.footerText !== undefined
      ? body.footerText
      : body.introText !== undefined
        ? body.introText
        : existing?.footerText;

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: {
      footerContent: JSON.stringify(nextContent),
      footerText: footerText ?? null,
      siteTagline: body.siteTagline ?? 'IMEI & Server Bureau',
      copyrightText: body.copyrightText ?? null,
      brandShowPoweredBy: body.brandShowPoweredBy ?? true,
      socialInstagram: body.socialInstagram ?? null,
      socialTiktok: body.socialTiktok ?? null,
      socialWhatsapp: body.socialWhatsapp ?? null,
      socialTelegram: body.socialTelegram ?? null,
      socialFacebook: body.socialFacebook ?? null,
      socialYoutube: body.socialYoutube ?? null,
    },
    update: {
      footerContent: JSON.stringify(nextContent),
      ...(body.siteTagline !== undefined ? { siteTagline: body.siteTagline } : {}),
      ...(footerText !== undefined ? { footerText } : {}),
      ...(body.copyrightText !== undefined ? { copyrightText: body.copyrightText } : {}),
      ...(body.brandShowPoweredBy !== undefined ? { brandShowPoweredBy: body.brandShowPoweredBy } : {}),
      ...(body.socialInstagram !== undefined ? { socialInstagram: body.socialInstagram } : {}),
      ...(body.socialTiktok !== undefined ? { socialTiktok: body.socialTiktok } : {}),
      ...(body.socialWhatsapp !== undefined ? { socialWhatsapp: body.socialWhatsapp } : {}),
      ...(body.socialTelegram !== undefined ? { socialTelegram: body.socialTelegram } : {}),
      ...(body.socialFacebook !== undefined ? { socialFacebook: body.socialFacebook } : {}),
      ...(body.socialYoutube !== undefined ? { socialYoutube: body.socialYoutube } : {}),
    },
  });

  await logActivity({
    userId: session!.user!.id,
    action: 'cms.footer_updated',
    entity: 'SiteSettings',
    entityId: 'singleton',
  });

  return NextResponse.json({ ok: true });
}
