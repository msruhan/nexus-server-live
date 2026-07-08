/**
 * POST /api/admin/branding/upload
 *
 * Uploads a logo or favicon and stores the resulting URL onto the
 * SiteSettings singleton. Field "kind" selects logo|favicon.
 *
 * Additive only — does not affect any order/API flow.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { saveUpload } from '@/lib/upload';
import { resetBrandingCache } from '@/lib/branding';
import { logActivity } from '@/lib/activity';

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const fd = await req.formData();
    const file = fd.get('file');
    const kind = String(fd.get('kind') ?? 'logo');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (kind !== 'logo' && kind !== 'favicon' && kind !== 'discord-avatar') {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const result = await saveUpload(file, kind === 'discord-avatar' ? 'discord' : 'branding');

    const settingsPatch =
      kind === 'logo'
        ? { logoUrl: result.url }
        : kind === 'favicon'
          ? { faviconUrl: result.url }
          : { discordBotAvatarUrl: result.url };

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: settingsPatch,
      create: {
        id: 'singleton',
        ...settingsPatch,
      },
    });

    if (kind !== 'discord-avatar') {
      resetBrandingCache();
    } else {
      const { resetDiscordWebhookConfigCache } = await import('@/lib/discord/webhook');
      resetDiscordWebhookConfigCache();
    }

    await logActivity({
      userId: session?.user.id,
      action: kind === 'discord-avatar' ? 'site.discord_avatar_uploaded' : 'site.branding_uploaded',
      entity: 'SiteSettings',
      metadata: { kind, url: result.url },
    });

    return NextResponse.json({ ok: true, url: result.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
