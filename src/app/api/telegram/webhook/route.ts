/**
 * Telegram Bot Webhook endpoint.
 *
 * Receives updates from Telegram when users send messages to the bot.
 * Secured via secret_token header (set during setWebhook call).
 *
 * This route does NOT touch any existing API management routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleMessage } from '@/lib/telegram/commands';
import type { TelegramUpdate } from '@/lib/telegram/types';

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      telegramBotEnabled: true,
      telegramWebhookSecret: true,
    },
  });

  if (!settings?.telegramBotEnabled) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (settings.telegramWebhookSecret && secret !== settings.telegramWebhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Process message (fire-and-forget style — respond 200 immediately to Telegram)
  if (update.message) {
    // Don't await — Telegram expects fast 200 response
    void handleMessage(update.message).catch((e) => {
      console.error('[telegram.webhook] handleMessage error:', e);
    });
  }

  // Always return 200 to Telegram to acknowledge receipt
  return NextResponse.json({ ok: true });
}
