/**
 * High-level Telegram notification helpers.
 *
 * Mirrors src/lib/email/notify.ts — fire-and-forget pattern.
 * Callers do `void notifyTelegramOrderStatus({...})` so the originating
 * action doesn't wait on the Telegram API.
 *
 * All functions are safe to call even when Telegram is disabled — they
 * return early silently.
 */
import { prisma } from '@/lib/db';
import { loadSettings, sendMessage, isUserEventEnabled, isAdminEventEnabled } from './client';
import * as tpl from './templates';

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function fmtUsd(n: bigint | number | string): string {
  const v = typeof n === 'string' ? Number(n) : Number(n);
  if (!Number.isFinite(v)) return String(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

async function getUserTelegram(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramNotifyEnabled: true,
      name: true,
    },
  });
}

// ─── User notifications ─────────────────────────────────────────

export async function notifyTelegramOrderCreated(input: {
  userId: string;
  orderCode: string;
  serviceName: string;
  imei?: string;
  price: string | number;
}) {
  try {
    const settings = await loadSettings();
    if (!settings) return;
    if (!isUserEventEnabled(settings, 'order.created')) return;
    const user = await getUserTelegram(input.userId);
    if (!user?.telegramChatId || !user.telegramNotifyEnabled) return;

    const base = resolveBaseUrl();
    const text = tpl.orderCreatedTemplate({
      orderCode: input.orderCode,
      serviceName: input.serviceName,
      imei: input.imei,
      price: fmtUsd(input.price),
      trackUrl: `${base}/track?code=${encodeURIComponent(input.orderCode)}`,
    });
    await sendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] orderCreated', e);
  }
}

export async function notifyTelegramOrderStatus(input: {
  kind: 'imei' | 'server';
  orderId: string;
}) {
  try {
    const settings = await loadSettings();
    if (!settings) return;

    const base = resolveBaseUrl();

    if (input.kind === 'imei') {
      const order = await prisma.imeiOrder.findUnique({
        where: { id: input.orderId },
        select: {
          orderCode: true,
          status: true,
          code: true,
          comments: true,
          userId: true,
          service: { select: { title: true } },
        },
      });
      if (!order) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;

      const evt = order.status === 'SUCCESS' ? 'order.success' : 'order.rejected';
      if (!isUserEventEnabled(settings, evt)) return;

      const user = await getUserTelegram(order.userId);
      if (!user?.telegramChatId || !user.telegramNotifyEnabled) return;

      const trackUrl = `${base}/track?code=${encodeURIComponent(order.orderCode)}`;
      const text =
        order.status === 'SUCCESS'
          ? tpl.orderSuccessTemplate({
              orderCode: order.orderCode,
              serviceName: order.service?.title ?? '—',
              result: order.code,
              comments: order.comments,
              trackUrl,
            })
          : tpl.orderRejectedTemplate({
              orderCode: order.orderCode,
              serviceName: order.service?.title ?? '—',
              comments: order.comments,
              trackUrl,
            });
      await sendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML' });
    } else {
      const order = await prisma.serverOrder.findUnique({
        where: { id: input.orderId },
        select: {
          orderCode: true,
          status: true,
          code: true,
          comments: true,
          userId: true,
          service: { select: { title: true } },
        },
      });
      if (!order) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;

      const evt = order.status === 'SUCCESS' ? 'order.success' : 'order.rejected';
      if (!isUserEventEnabled(settings, evt)) return;

      const user = await getUserTelegram(order.userId);
      if (!user?.telegramChatId || !user.telegramNotifyEnabled) return;

      const trackUrl = `${base}/track?code=${encodeURIComponent(order.orderCode)}`;
      const text =
        order.status === 'SUCCESS'
          ? tpl.orderSuccessTemplate({
              orderCode: order.orderCode,
              serviceName: order.service?.title ?? '—',
              result: order.code,
              comments: order.comments,
              trackUrl,
            })
          : tpl.orderRejectedTemplate({
              orderCode: order.orderCode,
              serviceName: order.service?.title ?? '—',
              comments: order.comments,
              trackUrl,
            });
      await sendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML' });
    }
  } catch (e) {
    console.error('[telegram.notify] orderStatus', e);
  }
}

export async function notifyTelegramPaymentCredited(input: {
  userId: string;
  amount: string | number;
  gateway: string;
  newBalance?: string | number;
}) {
  try {
    const settings = await loadSettings();
    if (!settings) return;
    if (!isUserEventEnabled(settings, 'payment.credited')) return;
    const user = await getUserTelegram(input.userId);
    if (!user?.telegramChatId || !user.telegramNotifyEnabled) return;

    const text = tpl.paymentCreditedTemplate({
      amount: fmtUsd(input.amount),
      gateway: input.gateway,
      newBalance: input.newBalance ? fmtUsd(input.newBalance) : undefined,
    });
    await sendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] paymentCredited', e);
  }
}

export async function notifyTelegramTicketReply(input: {
  ticketId: string;
  replyAuthorRole: 'USER' | 'ADMIN';
}) {
  try {
    const settings = await loadSettings();
    if (!settings) return;
    if (!isUserEventEnabled(settings, 'ticket.reply')) return;

    // Only notify user when admin replies
    if (input.replyAuthorRole !== 'ADMIN') return;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        ticketCode: true,
        subject: true,
        userId: true,
      },
    });
    if (!ticket) return;

    const user = await getUserTelegram(ticket.userId);
    if (!user?.telegramChatId || !user.telegramNotifyEnabled) return;

    const lastReply = await prisma.supportTicketReply.findFirst({
      where: { ticketId: input.ticketId, isSystem: false, authorRole: 'ADMIN' },
      orderBy: { createdAt: 'desc' },
      select: { body: true },
    });
    if (!lastReply) return;

    const base = resolveBaseUrl();
    const text = tpl.ticketReplyTemplate({
      ticketCode: ticket.ticketCode,
      subject: ticket.subject,
      body: lastReply.body,
      url: `${base}/user/tickets/${input.ticketId}`,
    });
    await sendMessage({ chatId: user.telegramChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] ticketReply', e);
  }
}

// ─── Admin notifications ────────────────────────────────────────

export async function notifyTelegramAdminNewOrder(input: {
  orderCode: string;
  userName: string;
  serviceName: string;
  price: string | number;
}) {
  try {
    const settings = await loadSettings();
    if (!settings?.adminChatId) return;
    if (!isAdminEventEnabled(settings, 'admin.order.new')) return;

    const text = tpl.adminNewOrderTemplate({
      orderCode: input.orderCode,
      userName: input.userName,
      serviceName: input.serviceName,
      price: fmtUsd(input.price),
    });
    await sendMessage({ chatId: settings.adminChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] adminNewOrder', e);
  }
}

export async function notifyTelegramAdminNewTopup(input: {
  userName: string;
  amount: string | number;
}) {
  try {
    const settings = await loadSettings();
    if (!settings?.adminChatId) return;
    if (!isAdminEventEnabled(settings, 'admin.topup.new')) return;

    const text = tpl.adminNewTopupTemplate({
      userName: input.userName,
      amount: fmtUsd(input.amount),
    });
    await sendMessage({ chatId: settings.adminChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] adminNewTopup', e);
  }
}

export async function notifyTelegramAdminNewTicket(input: {
  ticketCode: string;
  userName: string;
  subject: string;
}) {
  try {
    const settings = await loadSettings();
    if (!settings?.adminChatId) return;
    if (!isAdminEventEnabled(settings, 'admin.ticket.new')) return;

    const text = tpl.adminNewTicketTemplate({
      ticketCode: input.ticketCode,
      userName: input.userName,
      subject: input.subject,
    });
    await sendMessage({ chatId: settings.adminChatId, text, parseMode: 'HTML' });
  } catch (e) {
    console.error('[telegram.notify] adminNewTicket', e);
  }
}
