/**
 * User API for Telegram account linking.
 *
 * GET  — get current link status
 * POST — generate link code / unlink / toggle notifications
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramChatId: true,
      telegramUsername: true,
      telegramLinkedAt: true,
      telegramNotifyEnabled: true,
      telegramLinkCode: true,
      telegramLinkExpiresAt: true,
    },
  });

  // Check if bot is configured
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { telegramBotEnabled: true, telegramBotUsername: true },
  });

  const isLinked = !!user?.telegramChatId;
  const hasPendingCode =
    !!user?.telegramLinkCode &&
    user.telegramLinkExpiresAt &&
    user.telegramLinkExpiresAt > new Date();

  return NextResponse.json({
    botEnabled: settings?.telegramBotEnabled ?? false,
    botUsername: settings?.telegramBotUsername ?? '',
    isLinked,
    telegramUsername: user?.telegramUsername ?? null,
    linkedAt: user?.telegramLinkedAt?.toISOString() ?? null,
    notifyEnabled: user?.telegramNotifyEnabled ?? true,
    pendingCode: hasPendingCode ? user!.telegramLinkCode : null,
    pendingCodeExpiresAt: hasPendingCode ? user!.telegramLinkExpiresAt!.toISOString() : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ─── Generate link code ───────────────────────────────────────
  if (action === 'generateCode') {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramLinkCode: code,
        telegramLinkExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({ ok: true, code, expiresAt: expiresAt.toISOString() });
  }

  // ─── Unlink Telegram ──────────────────────────────────────────
  if (action === 'unlink') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        telegramLinkCode: null,
        telegramLinkExpiresAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ─── Toggle notifications ─────────────────────────────────────
  if (action === 'toggleNotify') {
    const { enabled } = body;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramNotifyEnabled: !!enabled },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
