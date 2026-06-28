/**
 * Admin API for Telegram Bot settings.
 *
 * GET  — load current settings
 * POST — save settings + optionally verify bot + set webhook
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/sub-admin';
import {
  getMe,
  setWebhook,
  deleteWebhook,
  sendMessage,
  resetSettingsCache,
  getWebhookInfo,
} from '@/lib/telegram/client';
import { testMessageTemplate } from '@/lib/telegram/templates';
import { parseGroupTopicConfig, telegramDeliveryHint } from '@/lib/telegram/group-config';
import { getBranding } from '@/lib/branding';
import crypto from 'crypto';

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
      telegramBotEnabled: true,
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramWebhookSecret: true,
      telegramAdminChatId: true,
      telegramChannelId: true,
      telegramChannelEnabled: true,
      telegramGroupId: true,
      telegramGroupTopicId: true,
      telegramGroupEnabled: true,
      telegramUserEvents: true,
      telegramAdminEvents: true,
    },
  });

  // null = all enabled (default). Convert to explicit arrays for the UI.
  // "none" sentinel = explicitly all-disabled.
  const parseEvents = (val: string | null | undefined): string[] | null =>
    val === null || val === undefined
      ? null
      : val.split(',').map((s) => s.trim()).filter(Boolean);

  return NextResponse.json({
    telegramBotEnabled: row?.telegramBotEnabled ?? false,
    telegramBotToken: row?.telegramBotToken ? '••••••' + row.telegramBotToken.slice(-8) : '',
    telegramBotUsername: row?.telegramBotUsername ?? '',
    telegramAdminChatId: row?.telegramAdminChatId ?? '',
    telegramChannelId: row?.telegramChannelId ?? '',
    telegramChannelEnabled: row?.telegramChannelEnabled ?? false,
    telegramGroupId: row?.telegramGroupId ?? '',
    telegramGroupTopicId: row?.telegramGroupTopicId != null ? String(row.telegramGroupTopicId) : '',
    telegramGroupEnabled: row?.telegramGroupEnabled ?? false,
    telegramUserEvents: parseEvents(row?.telegramUserEvents),
    telegramAdminEvents: parseEvents(row?.telegramAdminEvents),
    hasToken: !!row?.telegramBotToken,
    hasWebhookSecret: !!row?.telegramWebhookSecret,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAccess();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  // ─── Action: verify bot token ─────────────────────────────────
  if (action === 'verify') {
    const { token } = body;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    const result = await getMe(token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Invalid token' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, username: result.username, firstName: result.firstName });
  }

  // ─── Action: save settings ────────────────────────────────────
  if (action === 'save') {
    const {
      telegramBotEnabled,
      telegramBotToken,
      telegramAdminChatId,
      telegramChannelId,
      telegramChannelEnabled,
      telegramGroupId,
      telegramGroupTopicId,
      telegramGroupEnabled,
      telegramUserEvents,
      telegramAdminEvents,
    } = body;

    const parsedGroup = parseGroupTopicConfig(telegramGroupId, telegramGroupTopicId);
    if (!parsedGroup.ok) {
      return NextResponse.json({ error: parsedGroup.error }, { status: 400 });
    }
    if (telegramGroupEnabled && (!parsedGroup.value.groupId || parsedGroup.value.groupTopicId == null)) {
      return NextResponse.json(
        { error: 'Group chat ID and topic ID are required when group auto-post is enabled.' },
        { status: 400 },
      );
    }

    // If token is provided (not masked), verify it first
    let botUsername: string | undefined;
    let actualToken = telegramBotToken;

    if (actualToken && !actualToken.startsWith('••••••')) {
      const verify = await getMe(actualToken);
      if (!verify.ok) {
        return NextResponse.json({ error: 'Invalid bot token: ' + (verify.error ?? '') }, { status: 400 });
      }
      botUsername = verify.username;
    } else {
      // Keep existing token
      const existing = await prisma.siteSettings.findUnique({
        where: { id: 'singleton' },
        select: { telegramBotToken: true, telegramBotUsername: true },
      });
      actualToken = existing?.telegramBotToken ?? null;
      botUsername = existing?.telegramBotUsername ?? undefined;
    }

    // Generate webhook secret if not exists
    let webhookSecret: string | undefined;
    const existingSettings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { telegramWebhookSecret: true },
    });
    if (!existingSettings?.telegramWebhookSecret) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    const data: Record<string, unknown> = {
      telegramBotEnabled: !!telegramBotEnabled,
      telegramAdminChatId: telegramAdminChatId || null,
      telegramChannelId: telegramChannelId || null,
      telegramChannelEnabled: !!telegramChannelEnabled,
      telegramGroupId: parsedGroup.value.groupId,
      telegramGroupTopicId: parsedGroup.value.groupTopicId,
      telegramGroupEnabled: !!telegramGroupEnabled,
    };

    // Persist notification event allow-lists.
    // Convention: array of enabled keys → CSV. Empty array → "none" sentinel
    // (explicitly disabled all). Missing/undefined → leave unchanged.
    const serializeEvents = (val: unknown): string | undefined => {
      if (!Array.isArray(val)) return undefined;
      if (val.length === 0) return 'none';
      return val.filter((x) => typeof x === 'string').join(',');
    };
    const userEventsCsv = serializeEvents(telegramUserEvents);
    const adminEventsCsv = serializeEvents(telegramAdminEvents);
    if (userEventsCsv !== undefined) data.telegramUserEvents = userEventsCsv;
    if (adminEventsCsv !== undefined) data.telegramAdminEvents = adminEventsCsv;

    if (actualToken && !actualToken.startsWith('••••••')) {
      data.telegramBotToken = actualToken;
    }
    if (botUsername) data.telegramBotUsername = botUsername;
    if (webhookSecret) data.telegramWebhookSecret = webhookSecret;

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data } as Record<string, unknown> & { id: string },
    });

    // Set or delete webhook based on enabled state
    if (telegramBotEnabled && actualToken) {
      const secret = webhookSecret ?? existingSettings?.telegramWebhookSecret ?? '';
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL?.trim() ??
        process.env.AUTH_URL?.trim() ??
        'http://localhost:3000'
      ).replace(/\/$/, '');
      const webhookUrl = `${baseUrl}/api/telegram/webhook`;
      await setWebhook(actualToken, webhookUrl, secret);
    } else if (!telegramBotEnabled && actualToken) {
      await deleteWebhook(actualToken);
    }

    resetSettingsCache();
    return NextResponse.json({ ok: true, botUsername });
  }

  // ─── Action: test message to admin ────────────────────────────
  if (action === 'testAdmin') {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { telegramBotToken: true, telegramAdminChatId: true },
    });
    if (!settings?.telegramBotToken || !settings.telegramAdminChatId) {
      return NextResponse.json({ error: 'Bot token and admin chat ID required' }, { status: 400 });
    }
    const brand = await getBranding();
    const result = await sendMessage(
      {
        chatId: settings.telegramAdminChatId,
        text: testMessageTemplate(brand.siteName, 'Telegram bot is configured correctly!'),
        parseMode: 'HTML',
      },
      settings.telegramBotToken,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Action: test message to channel ──────────────────────────
  if (action === 'testChannel') {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { telegramBotToken: true, telegramChannelId: true },
    });
    if (!settings?.telegramBotToken || !settings.telegramChannelId) {
      return NextResponse.json({ error: 'Bot token and channel ID required' }, { status: 400 });
    }
    const brand = await getBranding();
    const result = await sendMessage(
      {
        chatId: settings.telegramChannelId,
        text: testMessageTemplate(brand.siteName, 'Channel integration is working!'),
        parseMode: 'HTML',
      },
      settings.telegramBotToken,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Action: test message to group topic ────────────────────────
  if (action === 'testGroup') {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        telegramBotToken: true,
        telegramGroupId: true,
        telegramGroupTopicId: true,
      },
    });
    if (!settings?.telegramBotToken || !settings.telegramGroupId || settings.telegramGroupTopicId == null) {
      return NextResponse.json(
        { error: 'Bot token, group chat ID, and topic ID required' },
        { status: 400 },
      );
    }
    const brand = await getBranding();
    const result = await sendMessage(
      {
        chatId: settings.telegramGroupId,
        messageThreadId: settings.telegramGroupTopicId,
        text: testMessageTemplate(
          brand.siteName,
          'Group topic integration is working! Service auto-posts will land in this topic.',
        ),
        parseMode: 'HTML',
      },
      settings.telegramBotToken,
    );
    if (!result.ok) {
      const err = result.error ?? 'Send failed';
      return NextResponse.json({ error: err + telegramDeliveryHint(err) }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Action: get webhook status ───────────────────────────────
  if (action === 'webhookStatus') {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { telegramBotToken: true },
    });
    if (!settings?.telegramBotToken) {
      return NextResponse.json({ error: 'No bot token' }, { status: 400 });
    }
    const info = await getWebhookInfo(settings.telegramBotToken);
    return NextResponse.json(info);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
