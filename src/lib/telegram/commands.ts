/**
 * Telegram bot command handlers.
 *
 * Processes incoming messages from the webhook and responds accordingly.
 * Each handler is self-contained and never throws.
 */
import { prisma } from '@/lib/db';
import { sendMessage, loadSettings } from './client';
import * as tpl from './templates';
import type { TelegramMessage } from './types';

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function fmtUsd(n: number | string | bigint): string {
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (!Number.isFinite(v)) return String(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/**
 * Main entry point — route a message to the appropriate handler.
 */
export async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? '';

  // Extract command
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const code = parts[1]; // /start CODE
    if (code) {
      await handleLink(chatId, code, message);
    } else {
      await handleStart(chatId, message);
    }
    return;
  }

  if (text === '/balance') {
    await handleBalance(chatId, message);
    return;
  }

  if (text === '/orders') {
    await handleOrders(chatId, message);
    return;
  }

  if (text.startsWith('/track')) {
    const parts = text.split(/\s+/);
    const orderCode = parts[1];
    if (orderCode) {
      await handleTrack(chatId, orderCode);
    } else {
      await sendMessage({
        chatId,
        text: '⚠️ Usage: /track <code>ORDER-CODE</code>',
        parseMode: 'HTML',
      });
    }
    return;
  }

  if (text === '/help') {
    await sendMessage({ chatId, text: tpl.helpTemplate(), parseMode: 'HTML' });
    return;
  }

  if (text === '/unlink') {
    await handleUnlink(chatId, message);
    return;
  }

  // Unknown command or plain text — show help hint
  if (text.startsWith('/')) {
    await sendMessage({
      chatId,
      text: `Unknown command. Use /help to see available commands.`,
    });
  }
}

// ─── Command handlers ───────────────────────────────────────────

async function handleStart(chatId: number, message: TelegramMessage) {
  // Check if already linked
  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(chatId) },
    select: { name: true },
  });

  const settings = await loadSettings();
  const botUsername = settings?.botUsername ?? 'NexusBot';

  if (user) {
    await sendMessage({
      chatId,
      text: `👋 Welcome back, <b>${escapeHtml(user.name)}</b>!\n\nUse /help to see available commands.`,
      parseMode: 'HTML',
    });
  } else {
    await sendMessage({
      chatId,
      text: tpl.welcomeTemplate(botUsername) +
        `\n\n⚠️ Your Telegram is not linked yet. Please link it from your account settings on the website.`,
      parseMode: 'HTML',
    });
  }
}

async function handleLink(chatId: number, code: string, message: TelegramMessage) {
  // Find user with this link code that hasn't expired
  const user = await prisma.user.findFirst({
    where: {
      telegramLinkCode: code,
      telegramLinkExpiresAt: { gte: new Date() },
    },
    select: { id: true, name: true },
  });

  if (!user) {
    await sendMessage({ chatId, text: tpl.linkInvalidTemplate(), parseMode: 'HTML' });
    return;
  }

  // Link the account
  const tgUsername = message.from?.username ?? null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: String(chatId),
      telegramUsername: tgUsername,
      telegramLinkedAt: new Date(),
      telegramLinkCode: null,
      telegramLinkExpiresAt: null,
    },
  });

  await sendMessage({
    chatId,
    text: tpl.linkSuccessTemplate(user.name),
    parseMode: 'HTML',
  });
}

async function handleBalance(chatId: number, message: TelegramMessage) {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(chatId) },
    select: { id: true, wallet: { select: { balance: true } } },
  });

  if (!user) {
    await sendMessage({ chatId, text: tpl.notLinkedTemplate(), parseMode: 'HTML' });
    return;
  }

  const balance = user.wallet ? fmtUsd(user.wallet.balance.toString()) : '$0.00';
  await sendMessage({ chatId, text: tpl.balanceTemplate(balance), parseMode: 'HTML' });
}

async function handleOrders(chatId: number, message: TelegramMessage) {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(chatId) },
    select: { id: true },
  });

  if (!user) {
    await sendMessage({ chatId, text: tpl.notLinkedTemplate(), parseMode: 'HTML' });
    return;
  }

  // Get last 5 IMEI + Server orders combined
  const [imeiOrders, serverOrders] = await Promise.all([
    prisma.imeiOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { orderCode: true, status: true, createdAt: true, service: { select: { title: true } } },
    }),
    prisma.serverOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { orderCode: true, status: true, createdAt: true, service: { select: { title: true } } },
    }),
  ]);

  const combined = [
    ...imeiOrders.map((o) => ({
      code: o.orderCode,
      service: o.service?.title ?? '—',
      status: o.status,
      date: o.createdAt.toISOString().slice(0, 10),
      at: o.createdAt.getTime(),
    })),
    ...serverOrders.map((o) => ({
      code: o.orderCode,
      service: o.service?.title ?? '—',
      status: o.status,
      date: o.createdAt.toISOString().slice(0, 10),
      at: o.createdAt.getTime(),
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  await sendMessage({
    chatId,
    text: tpl.ordersListTemplate(combined),
    parseMode: 'HTML',
  });
}

async function handleTrack(chatId: number, orderCode: string) {
  // Search both IMEI and Server orders
  const imei = await prisma.imeiOrder.findUnique({
    where: { orderCode },
    select: {
      orderCode: true,
      status: true,
      code: true,
      createdAt: true,
      service: { select: { title: true } },
    },
  });

  if (imei) {
    await sendMessage({
      chatId,
      text: tpl.trackResultTemplate({
        orderCode: imei.orderCode,
        serviceName: imei.service?.title ?? '—',
        status: imei.status,
        result: imei.code,
        createdAt: imei.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      }),
      parseMode: 'HTML',
    });
    return;
  }

  const server = await prisma.serverOrder.findUnique({
    where: { orderCode },
    select: {
      orderCode: true,
      status: true,
      code: true,
      createdAt: true,
      service: { select: { title: true } },
    },
  });

  if (server) {
    await sendMessage({
      chatId,
      text: tpl.trackResultTemplate({
        orderCode: server.orderCode,
        serviceName: server.service?.title ?? '—',
        status: server.status,
        result: server.code,
        createdAt: server.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      }),
      parseMode: 'HTML',
    });
    return;
  }

  await sendMessage({
    chatId,
    text: `❌ Order <code>${escapeHtml(orderCode)}</code> not found.`,
    parseMode: 'HTML',
  });
}

async function handleUnlink(chatId: number, message: TelegramMessage) {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(chatId) },
    select: { id: true },
  });

  if (!user) {
    await sendMessage({ chatId, text: tpl.notLinkedTemplate(), parseMode: 'HTML' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: null,
      telegramUsername: null,
      telegramLinkedAt: null,
    },
  });

  await sendMessage({ chatId, text: tpl.unlinkConfirmTemplate(), parseMode: 'HTML' });
}

// ─── Utility ────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
