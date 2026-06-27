import { isMarketplaceSystemGuestUser } from '@/lib/marketplace-guest-user';
import { sendWebPushToUser } from '@/lib/push/send';
import { createUserNotification } from '@/lib/user-notifications';

function pushWeb(input: {
  userId: string;
  title: string;
  body?: string;
  href: string;
  tag?: string;
}): void {
  void sendWebPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    url: input.href,
    tag: input.tag,
  });
}

export async function pushInAppOrderStatus(input: {
  userId: string;
  kind: 'imei' | 'server';
  orderId: string;
  orderCode: string;
  status: string;
  serviceTitle: string;
  href: string;
}): Promise<void> {
  if (await isMarketplaceSystemGuestUser(input.userId)) return;
  const title = `Order ${input.orderCode} — ${input.status}`;
  void createUserNotification({
    userId: input.userId,
    type: `${input.kind}.order.${input.status.toLowerCase()}`,
    title,
    body: input.serviceTitle,
    href: input.href,
    metadata: { orderId: input.orderId, kind: input.kind },
  });
  pushWeb({
    userId: input.userId,
    title,
    body: input.serviceTitle,
    href: input.href,
    tag: `${input.kind}-${input.orderId}-${input.status}`,
  });
}

export async function pushInAppOrderCreated(input: {
  userId: string;
  kind: 'imei' | 'server';
  orderId: string;
  orderCode: string;
  serviceTitle: string;
  href: string;
}): Promise<void> {
  if (await isMarketplaceSystemGuestUser(input.userId)) return;
  const title = `Order received — ${input.orderCode}`;
  const body = `${input.serviceTitle} is being processed.`;
  void createUserNotification({
    userId: input.userId,
    type: `${input.kind}.order.created`,
    title,
    body,
    href: input.href,
    metadata: { orderId: input.orderId, kind: input.kind },
  });
  pushWeb({
    userId: input.userId,
    title,
    body,
    href: input.href,
    tag: `${input.kind}-${input.orderId}-created`,
  });
}

export function pushInAppTopupApproved(input: {
  userId: string;
  amount: string;
}): void {
  const title = `Top-up of ${input.amount} approved`;
  void createUserNotification({
    userId: input.userId,
    type: 'wallet.topup_approved',
    title,
    body: 'Your wallet balance has been updated.',
    href: '/user/wallet',
  });
  pushWeb({
    userId: input.userId,
    title,
    body: 'Your wallet balance has been updated.',
    href: '/user/wallet',
    tag: `topup-${input.userId}`,
  });
}

export function pushInAppTicketReply(input: {
  userId: string;
  ticketCode: string;
  subject: string;
  ticketId: string;
}): void {
  const title = `Reply on ${input.ticketCode}`;
  void createUserNotification({
    userId: input.userId,
    type: 'ticket.reply',
    title,
    body: input.subject,
    href: `/user/tickets/${input.ticketId}`,
    metadata: { ticketId: input.ticketId },
  });
  pushWeb({
    userId: input.userId,
    title,
    body: input.subject,
    href: `/user/tickets/${input.ticketId}`,
    tag: `ticket-${input.ticketId}`,
  });
}
