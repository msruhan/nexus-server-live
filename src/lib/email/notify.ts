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
  welcomeTemplate,
  emailVerificationTemplate,
  orderCreatedTemplate,
  ticketStatusTemplate,
  topupRejectedTemplate,
  adminNewOrderTemplate,
  adminNewTopupTemplate,
  adminNewTicketTemplate,
} from './templates';
import {
  notifyTelegramOrderStatus,
  notifyTelegramPaymentCredited,
  notifyTelegramTicketReply,
} from '@/lib/telegram/notify';
import {
  resolveImeiOrderNotifyTarget,
  resolveServerOrderNotifyTarget,
} from '@/lib/email/order-contact';
import { resolveEmailContent } from '@/lib/email/template-store';
import type { EmailEvent } from '@/lib/email/types';
import {
  pushInAppOrderCreated,
  pushInAppOrderStatus,
  pushInAppTicketReply,
  pushInAppTopupApproved,
} from '@/lib/notify-user-inapp';
import { resolveSiteName } from '@/lib/site-name';

async function loadSiteName(): Promise<string> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { siteName: true },
  });
  return resolveSiteName(row?.siteName);
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

async function resolveAdminEmail(): Promise<string | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      adminNotificationEmail: true,
      supportEmail: true,
      smtpFromAddress: true,
    },
  });
  const admin = row?.adminNotificationEmail?.trim();
  if (admin) return admin;
  const support = row?.supportEmail?.trim();
  if (support) return support;
  const from = row?.smtpFromAddress?.trim();
  return from || null;
}

async function sendTemplatedEmail(input: {
  event: EmailEvent;
  to: string;
  vars: Record<string, string>;
  fallback: () => { subject: string; text: string; html: string };
  refType?: string;
  refId?: string;
}) {
  const content = await resolveEmailContent(input.event, input.vars, input.fallback);
  await sendEmail({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    event: input.event,
    refType: input.refType,
    refId: input.refId,
  });
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
    const vars = {
      siteName,
      recipientName: ticket.user.name ?? 'there',
      ticketCode: ticket.ticketCode,
      subject: ticket.subject,
      body: lastReply.body.slice(0, 1500),
      url,
    };
    await sendTemplatedEmail({
      event: 'ticket.reply',
      to: ticket.user.email,
      vars,
      fallback: () => {
        const { text, html } = ticketReplyTemplate({
          siteName,
          recipientName: ticket.user!.name ?? 'there',
          ticketCode: ticket.ticketCode,
          subject: ticket.subject,
          authorRole: lastReply.authorRole,
          body: lastReply.body.slice(0, 1500),
          url,
        });
        return { subject: `Reply on ${ticket.ticketCode} — ${ticket.subject}`, text, html };
      },
      refType: 'SupportTicket',
      refId: ticket.id,
    });

    pushInAppTicketReply({
      userId: ticket.userId,
      ticketCode: ticket.ticketCode,
      subject: ticket.subject,
      ticketId: ticket.id,
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
          guestEmail: true,
          user: { select: { id: true, email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      const target = order ? await resolveImeiOrderNotifyTarget(order) : null;
      if (!order || !target) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;
      const siteName = await loadSiteName();
      const event: EmailEvent =
        order.status === 'SUCCESS' ? 'order.imei.success' : 'order.imei.rejected';
      const vars = {
        siteName,
        recipientName: target.name,
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        status: order.status,
        resultCode: order.code ?? '',
        comments: order.comments ?? '',
        url: target.trackUrl,
      };
      await sendTemplatedEmail({
        event,
        to: target.email,
        vars,
        fallback: () => {
          const { text, html } = orderStatusTemplate({
            siteName,
            recipientName: target.name,
            orderCode: order.orderCode,
            serviceName: order.service?.title ?? '—',
            status: order.status,
            resultCode: order.code,
            comments: order.comments,
            url: target.trackUrl,
          });
          return { subject: `Order ${order.orderCode} — ${order.status}`, text, html };
        },
        refType: 'ImeiOrder',
        refId: order.id,
      });

      void pushInAppOrderStatus({
        userId: order.user.id,
        kind: 'imei',
        orderId: order.id,
        orderCode: order.orderCode,
        status: order.status,
        serviceTitle: order.service?.title ?? 'Order',
        href: target.isGuest ? target.trackUrl : `/user/orders/${order.id}?type=imei`,
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
          email: true,
          user: { select: { id: true, email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      const target = order ? await resolveServerOrderNotifyTarget(order) : null;
      if (!order || !target) return;
      if (order.status !== 'SUCCESS' && order.status !== 'REJECTED') return;
      const siteName = await loadSiteName();
      const event: EmailEvent =
        order.status === 'SUCCESS' ? 'order.server.success' : 'order.server.rejected';
      const vars = {
        siteName,
        recipientName: target.name,
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        status: order.status,
        resultCode: order.code ?? '',
        comments: order.comments ?? '',
        url: target.trackUrl,
      };
      await sendTemplatedEmail({
        event,
        to: target.email,
        vars,
        fallback: () => {
          const { text, html } = orderStatusTemplate({
            siteName,
            recipientName: target.name,
            orderCode: order.orderCode,
            serviceName: order.service?.title ?? '—',
            status: order.status,
            resultCode: order.code,
            comments: order.comments,
            url: target.trackUrl,
          });
          return { subject: `Order ${order.orderCode} — ${order.status}`, text, html };
        },
        refType: 'ServerOrder',
        refId: order.id,
      });

      void pushInAppOrderStatus({
        userId: order.user.id,
        kind: 'server',
        orderId: order.id,
        orderCode: order.orderCode,
        status: order.status,
        serviceTitle: order.service?.title ?? 'Order',
        href: target.isGuest ? target.trackUrl : `/user/orders/${order.id}?type=server`,
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
    const amountLabel = fmtUsd(input.amount);
    const balanceLabel = fmtUsd(input.newBalance);
    await sendTemplatedEmail({
      event: 'wallet.topup_approved',
      to: user.email,
      vars: {
        siteName,
        recipientName: user.name ?? 'there',
        amount: amountLabel,
        newBalance: balanceLabel,
        url,
      },
      fallback: () => {
        const { text, html } = topupApprovedTemplate({
          siteName,
          recipientName: user!.name ?? 'there',
          amount: amountLabel,
          newBalance: balanceLabel,
          url,
        });
        return { subject: `Top-up of ${amountLabel} approved`, text, html };
      },
    });

    void notifyTelegramPaymentCredited({
      userId: input.userId,
      amount: typeof input.amount === 'bigint' ? Number(input.amount) : input.amount,
      gateway: 'Manual top-up',
      newBalance: typeof input.newBalance === 'bigint' ? Number(input.newBalance) : input.newBalance,
    });

    pushInAppTopupApproved({ userId: input.userId, amount: amountLabel });
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

export async function notifyRegistered(input: { userId: string; email: string; name: string }) {
  try {
    const siteName = await loadSiteName();
    const loginUrl = `${resolveBaseUrl()}/login`;
    const { text, html } = welcomeTemplate({
      siteName,
      recipientName: input.name || 'there',
      loginUrl,
    });
    await sendEmail({
      to: input.email,
      subject: `Welcome to ${siteName}`,
      text,
      html,
      event: 'auth.registered',
      refType: 'User',
      refId: input.userId,
    });
  } catch (e) {
    console.error('[notify] auth.registered', e);
  }
}

export async function notifyEmailVerification(input: {
  userId: string;
  email: string;
  name: string;
  token: string;
}) {
  try {
    const siteName = await loadSiteName();
    const verifyUrl = `${resolveBaseUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;
    const { text, html } = emailVerificationTemplate({
      siteName,
      recipientName: input.name || 'there',
      verifyUrl,
    });
    await sendEmail({
      to: input.email,
      subject: `Verify your ${siteName} account`,
      text,
      html,
      event: 'auth.email_verification',
      refType: 'User',
      refId: input.userId,
    });
  } catch (e) {
    console.error('[notify] auth.email_verification', e);
  }
}

export async function notifyOrderCreated(input: {
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
          price: true,
          guestEmail: true,
          user: { select: { id: true, email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      const target = order ? await resolveImeiOrderNotifyTarget(order) : null;
      if (!order || !target) return;
      const siteName = await loadSiteName();
      const amountLabel = fmtUsd(order.price.toString());
      const vars = {
        siteName,
        recipientName: target.name,
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        amount: amountLabel,
        url: target.trackUrl,
      };
      await sendTemplatedEmail({
        event: 'order.imei.created',
        to: target.email,
        vars,
        fallback: () => {
          const { text, html } = orderCreatedTemplate({
            siteName,
            recipientName: target.name,
            orderCode: order.orderCode,
            serviceName: order.service?.title ?? '—',
            amount: amountLabel,
            url: target.trackUrl,
          });
          return { subject: `Order received — ${order.orderCode}`, text, html };
        },
        refType: 'ImeiOrder',
        refId: order.id,
      });

      void pushInAppOrderCreated({
        userId: order.user.id,
        kind: 'imei',
        orderId: order.id,
        orderCode: order.orderCode,
        serviceTitle: order.service?.title ?? 'Order',
        href: target.isGuest ? target.trackUrl : `/user/orders/${order.id}?type=imei`,
      });
    } else {
      const order = await prisma.serverOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          orderCode: true,
          price: true,
          email: true,
          user: { select: { id: true, email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      const target = order ? await resolveServerOrderNotifyTarget(order) : null;
      if (!order || !target) return;
      const siteName = await loadSiteName();
      const amountLabel = fmtUsd(order.price.toString());
      const vars = {
        siteName,
        recipientName: target.name,
        orderCode: order.orderCode,
        serviceName: order.service?.title ?? '—',
        amount: amountLabel,
        url: target.trackUrl,
      };
      await sendTemplatedEmail({
        event: 'order.server.created',
        to: target.email,
        vars,
        fallback: () => {
          const { text, html } = orderCreatedTemplate({
            siteName,
            recipientName: target.name,
            orderCode: order.orderCode,
            serviceName: order.service?.title ?? '—',
            amount: amountLabel,
            url: target.trackUrl,
          });
          return { subject: `Order received — ${order.orderCode}`, text, html };
        },
        refType: 'ServerOrder',
        refId: order.id,
      });

      void pushInAppOrderCreated({
        userId: order.user.id,
        kind: 'server',
        orderId: order.id,
        orderCode: order.orderCode,
        serviceTitle: order.service?.title ?? 'Order',
        href: target.isGuest ? target.trackUrl : `/user/orders/${order.id}?type=server`,
      });
    }
  } catch (e) {
    console.error('[notify] order.created', e);
  }
}

export async function notifyTicketStatusChanged(input: {
  ticketId: string;
  previousStatus: string;
  newStatus: string;
}) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        ticketCode: true,
        subject: true,
        user: { select: { email: true, name: true } },
      },
    });
    if (!ticket?.user?.email) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/user/tickets/${ticket.id}`;
    const { text, html } = ticketStatusTemplate({
      siteName,
      recipientName: ticket.user.name ?? 'there',
      ticketCode: ticket.ticketCode,
      subject: ticket.subject,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      url,
    });
    await sendEmail({
      to: ticket.user.email,
      subject: `Ticket ${ticket.ticketCode} — status updated`,
      text,
      html,
      event: 'ticket.status_changed',
      refType: 'SupportTicket',
      refId: ticket.id,
    });
  } catch (e) {
    console.error('[notify] ticket.status_changed', e);
  }
}

export async function notifyTopupRejected(input: { topupRequestId: string }) {
  try {
    const row = await prisma.topupRequest.findUnique({
      where: { id: input.topupRequestId },
      select: {
        id: true,
        amount: true,
        user: { select: { email: true, name: true } },
      },
    });
    if (!row?.user?.email) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/user/wallet`;
    const { text, html } = topupRejectedTemplate({
      siteName,
      recipientName: row.user.name ?? 'there',
      amount: fmtUsd(row.amount.toString()),
      url,
    });
    await sendEmail({
      to: row.user.email,
      subject: `Top-up request not approved`,
      text,
      html,
      event: 'wallet.topup_rejected',
      refType: 'TopupRequest',
      refId: row.id,
    });
  } catch (e) {
    console.error('[notify] wallet.topup_rejected', e);
  }
}

export async function notifyAdminNewOrder(input: {
  orderCode: string;
  userName: string;
  serviceName: string;
  price: string | number | bigint;
  kind: 'imei' | 'server';
}) {
  try {
    const to = await resolveAdminEmail();
    if (!to) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/admin/orders`;
    const { text, html } = adminNewOrderTemplate({
      siteName,
      orderCode: input.orderCode,
      userName: input.userName,
      serviceName: input.serviceName,
      amount: fmtUsd(input.price),
      url,
    });
    await sendEmail({
      to,
      subject: `New order — ${input.orderCode}`,
      text,
      html,
      event: 'admin.order.new',
    });
  } catch (e) {
    console.error('[notify] admin.order.new', e);
  }
}

export async function notifyAdminNewTopup(input: {
  userName: string;
  amount: string | number | bigint;
}) {
  try {
    const to = await resolveAdminEmail();
    if (!to) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/admin/wallet`;
    const { text, html } = adminNewTopupTemplate({
      siteName,
      userName: input.userName,
      amount: fmtUsd(input.amount),
      url,
    });
    await sendEmail({
      to,
      subject: 'New top-up request',
      text,
      html,
      event: 'admin.topup.new',
    });
  } catch (e) {
    console.error('[notify] admin.topup.new', e);
  }
}

export async function notifyAdminNewTicket(input: {
  ticketCode: string;
  userName: string;
  subject: string;
  ticketId: string;
}) {
  try {
    const to = await resolveAdminEmail();
    if (!to) return;
    const siteName = await loadSiteName();
    const url = `${resolveBaseUrl()}/admin/tickets/${input.ticketId}`;
    const { text, html } = adminNewTicketTemplate({
      siteName,
      ticketCode: input.ticketCode,
      userName: input.userName,
      subject: input.subject,
      url,
    });
    await sendEmail({
      to,
      subject: `New ticket — ${input.ticketCode}`,
      text,
      html,
      event: 'admin.ticket.new',
    });
  } catch (e) {
    console.error('[notify] admin.ticket.new', e);
  }
}
