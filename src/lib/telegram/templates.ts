/**
 * Telegram message templates (HTML parse mode).
 *
 * Telegram supports a subset of HTML: <b>, <i>, <u>, <s>, <code>,
 * <pre>, <a href="">, <tg-spoiler>.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── User notifications ─────────────────────────────────────────

export function orderCreatedTemplate(p: {
  orderCode: string;
  serviceName: string;
  imei?: string;
  price: string;
  trackUrl: string;
}): string {
  return [
    `📦 <b>New Order Placed</b>`,
    ``,
    `Order: <code>${escapeHtml(p.orderCode)}</code>`,
    `Service: ${escapeHtml(p.serviceName)}`,
    p.imei ? `IMEI: <code>${escapeHtml(p.imei)}</code>` : null,
    `Price: <b>${escapeHtml(p.price)}</b>`,
    ``,
    `Status: ⏳ PENDING`,
    ``,
    `<a href="${p.trackUrl}">Track your order →</a>`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function orderSuccessTemplate(p: {
  orderCode: string;
  serviceName: string;
  result?: string | null;
  comments?: string | null;
  trackUrl: string;
}): string {
  return [
    `✅ <b>Order Completed</b>`,
    ``,
    `Order: <code>${escapeHtml(p.orderCode)}</code>`,
    `Service: ${escapeHtml(p.serviceName)}`,
    `Status: ✅ SUCCESS`,
    p.result ? `\nResult:\n<code>${escapeHtml(p.result.slice(0, 500))}</code>` : null,
    p.comments ? `\nComments: ${escapeHtml(p.comments.slice(0, 200))}` : null,
    ``,
    `<a href="${p.trackUrl}">View details →</a>`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function orderRejectedTemplate(p: {
  orderCode: string;
  serviceName: string;
  comments?: string | null;
  trackUrl: string;
}): string {
  return [
    `❌ <b>Order Rejected</b>`,
    ``,
    `Order: <code>${escapeHtml(p.orderCode)}</code>`,
    `Service: ${escapeHtml(p.serviceName)}`,
    `Status: ❌ REJECTED`,
    p.comments ? `\nReason: ${escapeHtml(p.comments.slice(0, 300))}` : null,
    ``,
    `<a href="${p.trackUrl}">View details →</a>`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function paymentCreditedTemplate(p: {
  amount: string;
  gateway: string;
  newBalance?: string;
}): string {
  return [
    `💰 <b>Payment Received</b>`,
    ``,
    `Amount: <b>${escapeHtml(p.amount)}</b>`,
    `Gateway: ${escapeHtml(p.gateway)}`,
    p.newBalance ? `New balance: ${escapeHtml(p.newBalance)}` : null,
    ``,
    `Your wallet has been credited.`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function ticketReplyTemplate(p: {
  ticketCode: string;
  subject: string;
  body: string;
  url: string;
}): string {
  return [
    `💬 <b>New Ticket Reply</b>`,
    ``,
    `Ticket: <code>${escapeHtml(p.ticketCode)}</code>`,
    `Subject: ${escapeHtml(p.subject)}`,
    ``,
    `${escapeHtml(p.body.slice(0, 300))}${p.body.length > 300 ? '…' : ''}`,
    ``,
    `<a href="${p.url}">View ticket →</a>`,
  ].join('\n');
}

// ─── Admin notifications ────────────────────────────────────────

export function adminNewOrderTemplate(p: {
  orderCode: string;
  userName: string;
  serviceName: string;
  price: string;
}): string {
  return [
    `🆕 <b>New Order</b>`,
    ``,
    `From: ${escapeHtml(p.userName)}`,
    `Order: <code>${escapeHtml(p.orderCode)}</code>`,
    `Service: ${escapeHtml(p.serviceName)}`,
    `Price: ${escapeHtml(p.price)}`,
  ].join('\n');
}

export function adminNewTopupTemplate(p: {
  userName: string;
  amount: string;
}): string {
  return [
    `💳 <b>New Top-up Request</b>`,
    ``,
    `From: ${escapeHtml(p.userName)}`,
    `Amount: <b>${escapeHtml(p.amount)}</b>`,
    ``,
    `Awaiting approval.`,
  ].join('\n');
}

export function adminNewTicketTemplate(p: {
  ticketCode: string;
  userName: string;
  subject: string;
}): string {
  return [
    `🎫 <b>New Support Ticket</b>`,
    ``,
    `From: ${escapeHtml(p.userName)}`,
    `Ticket: <code>${escapeHtml(p.ticketCode)}</code>`,
    `Subject: ${escapeHtml(p.subject)}`,
  ].join('\n');
}

// ─── Channel posts ──────────────────────────────────────────────

export function channelNewServiceTemplate(p: {
  title: string;
  category: string;
  price: string;
  deliveryTime?: string | null;
  siteUrl: string;
}): string {
  return [
    `🚀 <b>New Service Available</b>`,
    ``,
    `<b>${escapeHtml(p.title)}</b>`,
    `Category: ${escapeHtml(p.category)}`,
    `Price: ${escapeHtml(p.price)}`,
    p.deliveryTime ? `Delivery: ${escapeHtml(p.deliveryTime)}` : null,
    ``,
    `<a href="${p.siteUrl}">Order now →</a>`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function channelPriceUpdateTemplate(p: {
  title: string;
  oldPrice: string;
  newPrice: string;
  siteUrl: string;
}): string {
  return [
    `💲 <b>Price Update</b>`,
    ``,
    `<b>${escapeHtml(p.title)}</b>`,
    `Old price: <s>${escapeHtml(p.oldPrice)}</s>`,
    `New price: <b>${escapeHtml(p.newPrice)}</b>`,
    ``,
    `<a href="${p.siteUrl}">View service →</a>`,
  ].join('\n');
}

// ─── Bot command responses ──────────────────────────────────────

export function welcomeTemplate(botUsername: string): string {
  return [
    `👋 <b>Welcome to Nexus Server Bot!</b>`,
    ``,
    `I can help you with:`,
    `• /balance — Check your wallet balance`,
    `• /orders — View recent orders`,
    `• /track <code>ORDER-CODE</code> — Track an order`,
    `• /help — Show all commands`,
    `• /unlink — Disconnect your Telegram`,
    ``,
    `You'll receive notifications for order updates, payments, and ticket replies.`,
  ].join('\n');
}

export function linkSuccessTemplate(userName: string): string {
  return [
    `✅ <b>Account Linked!</b>`,
    ``,
    `Your Telegram is now connected to: <b>${escapeHtml(userName)}</b>`,
    ``,
    `You'll receive notifications here. Use /help to see available commands.`,
  ].join('\n');
}

export function linkInvalidTemplate(): string {
  return [
    `❌ <b>Invalid or expired link code.</b>`,
    ``,
    `Please generate a new code from your account settings and try again.`,
  ].join('\n');
}

export function balanceTemplate(balance: string): string {
  return [
    `💰 <b>Your Balance</b>`,
    ``,
    `Available: <b>${escapeHtml(balance)}</b>`,
  ].join('\n');
}

export function ordersListTemplate(orders: Array<{ code: string; service: string; status: string; date: string }>): string {
  if (orders.length === 0) {
    return `📋 You have no recent orders.`;
  }
  const lines = orders.map(
    (o) => `• <code>${escapeHtml(o.code)}</code> — ${escapeHtml(o.status)} (${escapeHtml(o.date)})`,
  );
  return [`📋 <b>Recent Orders</b>`, ``, ...lines].join('\n');
}

export function trackResultTemplate(p: {
  orderCode: string;
  serviceName: string;
  status: string;
  result?: string | null;
  createdAt: string;
}): string {
  const statusEmoji =
    p.status === 'SUCCESS' ? '✅' : p.status === 'REJECTED' ? '❌' : p.status === 'IN_PROCESS' ? '⚙️' : '⏳';
  return [
    `🔍 <b>Order Status</b>`,
    ``,
    `Order: <code>${escapeHtml(p.orderCode)}</code>`,
    `Service: ${escapeHtml(p.serviceName)}`,
    `Status: ${statusEmoji} ${escapeHtml(p.status)}`,
    `Created: ${escapeHtml(p.createdAt)}`,
    p.result ? `\nResult:\n<code>${escapeHtml(p.result.slice(0, 500))}</code>` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function helpTemplate(): string {
  return [
    `ℹ️ <b>Available Commands</b>`,
    ``,
    `/balance — Check wallet balance`,
    `/orders — View last 5 orders`,
    `/track <code>CODE</code> — Track order by code`,
    `/help — Show this message`,
    `/unlink — Disconnect Telegram from your account`,
  ].join('\n');
}

export function unlinkConfirmTemplate(): string {
  return `✅ Your Telegram has been unlinked from your account. You will no longer receive notifications here.`;
}

export function notLinkedTemplate(): string {
  return `⚠️ Your Telegram is not linked to any account. Please link it from your account settings on the website.`;
}
