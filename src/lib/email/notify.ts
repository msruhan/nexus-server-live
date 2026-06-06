/**
 * High-level "notify" helpers. Each helper resolves the recipient + site
 * settings, builds the email body via the template, and sends via the
 * mailer. ALWAYS fire-and-forget — never throw out of these functions.
 *
 * Callers do `void notifyTicketReply({...})` so the originating action
 * doesn't wait on SMTP.
 */
import { prisma } from '@/lib/db';
import { sendEmail } from './mailer';
import {
  ticketReplyTemplate,
  orderStatusTemplate,
  topupApprovedTemplate,
  paymentCreditedTemplate,
  passwordChangedTemplate,
} from './templates';
import {
  notifyTelegramOrderStatus,
  notifyTelegramPaymentCredited,
  notifyTelegramTicketReply,
} from '@/lib/telegram/notify';

async function loadSiteName(): Promise<string> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { siteName: true },
  });
  return row?.siteName ?? 'Recovero';
}

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

export async function notifyTicketReply(input: {
  ticketId: string;
  replyAuthorRole: 'USER' | 'ADMIN';
}) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        ticketCode: true,
        subject: true,
        userId: true,
        user: { select: { email: true, name: true } },
      },
    });
    if (!ticket) return;

    // For now we only email the USER when ADMIN replies. Admin replies-to-self
    // are not interesting; admin gets in-dashboard notification via list page.
    if (input.replyAuthorRole !== 'ADMIN') return;
    if (!ticket.user?.email) return;

    const lastReply = await prisma.supportTicketReply.findFirst({
      where: { ticketId: ticket.id, isSystem: false },
      orderBy: { createdAt: 'desc' },
      select: { body: true, authorRole: true },
    });
    if (!lastReply) return;

    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/user/tickets/${ticket.id}`;
    const { text, html } = ticketReplyTemplate({
      siteName,
      recipientName: ticket.user.name ?? 'there',
      ticketCode: ticket.ticketCode,
      subject: ticket.subject,
      authorRole: lastReply.authorRole,
      body: lastReply.body.slice(0, 1500),
      url,
    });
    await sendEmail({
      to: ticket.user.email,
      subject: `Reply on ${ticket.ticketCode} — ${ticket.subject}`,
      text,
      html,
      event: 'ticket.reply',
      refType: 'SupportTicket',
      refId: ticket.id,
    });

    // Fire-and-forget Telegram notification alongside email
    void notifyTelegramTicketReply({ ticketId: input.ticketId, replyAuthorRole: input.replyAuthorRole });
  } catch (e) {
    console.error('[notify] ticket.reply', e);
  }
}

export async function notifyOrderStatus(input: {
  kind: 'imei' | 'server';
  orderId: string;
}) {
  try {
    if (input.kind === 'imei') {
      const order = await prisma.imeiOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          orderCode: true,
          status: true,
          code: true,
          comments: true,
          user: { select: { email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      if (!order?.user?.email) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;
      const siteName = await loadSiteName();
      const url = `${resolveBaseUrl()}/user/orders`;
      const { text, html } = orderStatusTemplate({
        siteName,
        recipientName: order.user.name ?? 'there',
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        status: order.status,
        resultCode: order.code,
        comments: order.comments,
        url,
      });
      await sendEmail({
        to: order.user.email,
        subject: `Order ${order.orderCode} — ${order.status}`,
        text,
        html,
        event: order.status === 'SUCCESS' ? 'order.imei.success' : 'order.imei.rejected',
        refType: 'ImeiOrder',
        refId: order.id,
      });

      // Fire-and-forget Telegram
      void notifyTelegramOrderStatus({ kind: 'imei', orderId: input.orderId });
    } else {
      const order = await prisma.serverOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          orderCode: true,
          status: true,
          code: true,
          comments: true,
          user: { select: { email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      if (!order?.user?.email) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;
      const siteName = await loadSiteName();
      const url = `${resolveBaseUrl()}/user/orders`;
      const { text, html } = orderStatusTemplate({
        siteName,
        recipientName: order.user.name ?? 'there',
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        status: order.status,
        resultCode: order.code,
        comments: order.comments,
        url,
      });
      await sendEmail({
        to: order.user.email,
        subject: `Order ${order.orderCode} — ${order.status}`,
        text,
        html,
        event: order.status === 'SUCCESS' ? 'order.server.success' : 'order.server.rejected',
        refType: 'ServerOrder',
        refId: order.id,
      });

      // Fire-and-forget Telegram
      void notifyTelegramOrderStatus({ kind: 'server', orderId: input.orderId });
    }
  } catch (e) {
    console.error('[notify] order.status', e);
  }
}

export async function notifyTopupApproved(input: {
  userId: string;
  amount: string | number | bigint;
  newBalance: string | number | bigint;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/user/wallet`;
    const { text, html } = topupApprovedTemplate({
      siteName,
      recipientName: user.name ?? 'there',
      amount: fmtUsd(input.amount),
      newBalance: fmtUsd(input.newBalance),
      url,
    });
    await sendEmail({
      to: user.email,
      subject: `Top-up of ${fmtUsd(input.amount)} approved`,
      text,
      html,
      event: 'wallet.topup_approved',
    });
  } catch (e) {
    console.error('[notify] topup.approved', e);
  }
}

export async function notifyPaymentCredited(input: {
  userId: string;
  amount: string | number | bigint;
  gateway: string;
  txHash?: string | null;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/user/wallet`;
    const { text, html } = paymentCreditedTemplate({
      siteName,
      recipientName: user.name ?? 'there',
      amount: fmtUsd(input.amount),
      gateway: input.gateway,
      txHash: input.txHash,
      url,
    });
    await sendEmail({
      to: user.email,
      subject: `Payment received — ${fmtUsd(input.amount)}`,
      text,
      html,
      event: 'payment.credited',
    });

    // Fire-and-forget Telegram
    void notifyTelegramPaymentCredited({
      userId: input.userId,
      amount: typeof input.amount === 'bigint' ? Number(input.amount) : input.amount,
      gateway: input.gateway,
    });
  } catch (e) {
    console.error('[notify] payment.credited', e);
  }
}

export async function notifyPasswordChanged(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;
    const siteName = await loadSiteName();
    const { text, html } = passwordChangedTemplate({
      siteName,
      recipientName: user.name ?? 'there',
    });
    await sendEmail({
      to: user.email,
      subject: 'Your password was changed',
      text,
      html,
      event: 'auth.password_changed',
    });
  } catch (e) {
    console.error('[notify] password.changed', e);
  }
}
