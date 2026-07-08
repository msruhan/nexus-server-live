import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import { getBranding } from '@/lib/branding';
import {
  normalizeDiscordBotUsername,
  postDiscordTestMessage,
  resetDiscordWebhookConfigCache,
} from '@/lib/discord/webhook';

function isValidDiscordWebhookUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^https:\/\/discord\.com\/api\/webhooks\//i.test(value.trim());
}

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role ?? 'USER';
  if (role !== 'ADMIN' && role !== 'SUB_ADMIN') return null;
  if (role === 'SUB_ADMIN') {
    const allowed = await hasPermission(session.user.id, role, 'manageTelegram');
    if (!allowed) return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      discordWebhookEnabled: true,
      discordWebhookUrl: true,
      discordBotUsername: true,
      discordBotAvatarUrl: true,
    },
  });

  return NextResponse.json({
    discordWebhookEnabled: row?.discordWebhookEnabled ?? false,
    discordWebhookUrl: row?.discordWebhookUrl ?? '',
    discordBotUsername: row?.discordBotUsername ?? '',
    discordBotAvatarUrl: row?.discordBotAvatarUrl ?? '',
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const action = body?.action as string | undefined;

  if (action === 'save') {
    const enabled = body?.discordWebhookEnabled === true;
    const url = typeof body?.discordWebhookUrl === 'string' ? body.discordWebhookUrl.trim() : '';
    const username = normalizeDiscordBotUsername(
      typeof body?.discordBotUsername === 'string' ? body.discordBotUsername : '',
    );
    const clearAvatar = body?.clearDiscordBotAvatar === true;

    if (enabled && !isValidDiscordWebhookUrl(url)) {
      return NextResponse.json({ error: 'Valid Discord webhook URL is required when enabled' }, { status: 400 });
    }
    if (url && !isValidDiscordWebhookUrl(url)) {
      return NextResponse.json({ error: 'Discord webhook URL is invalid' }, { status: 400 });
    }
    if (enabled && !username) {
      return NextResponse.json({ error: 'Discord bot username is required when enabled' }, { status: 400 });
    }

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        discordWebhookEnabled: enabled,
        discordWebhookUrl: url || null,
        discordBotUsername: username,
        ...(clearAvatar ? { discordBotAvatarUrl: null } : {}),
      },
      create: {
        id: 'singleton',
        discordWebhookEnabled: enabled,
        discordWebhookUrl: url || null,
        discordBotUsername: username,
        discordBotAvatarUrl: null,
      },
    });
    resetDiscordWebhookConfigCache();
    return NextResponse.json({ ok: true });
  }

  if (action === 'test') {
    const brand = await getBranding();
    const result = await postDiscordTestMessage(brand.siteName);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
