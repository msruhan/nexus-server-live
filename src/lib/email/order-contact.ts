import { getMarketplaceSystemGuestUserId, displayNameFromEmail } from '@/lib/marketplace-guest-user';

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export type OrderNotifyTarget = {
  email: string;
  name: string;
  trackUrl: string;
  isGuest: boolean;
};

export function orderTrackUrl(orderCode: string, isGuest: boolean): string {
  const base = resolveBaseUrl();
  if (isGuest) return `${base}/track?code=${encodeURIComponent(orderCode)}`;
  return `${base}/user/orders`;
}

export async function resolveImeiOrderNotifyTarget(order: {
  orderCode: string;
  guestEmail: string | null;
  user: { id: string; email: string; name: string | null };
}): Promise<OrderNotifyTarget | null> {
  const guestUserId = await getMarketplaceSystemGuestUserId();
  if (order.user.id === guestUserId) {
    const email = order.guestEmail?.trim();
    if (!email) return null;
    return {
      email,
      name: displayNameFromEmail(email),
      trackUrl: orderTrackUrl(order.orderCode, true),
      isGuest: true,
    };
  }
  if (!order.user.email) return null;
  return {
    email: order.user.email,
    name: order.user.name ?? 'there',
    trackUrl: orderTrackUrl(order.orderCode, false),
    isGuest: false,
  };
}

export async function resolveServerOrderNotifyTarget(order: {
  orderCode: string;
  email: string | null;
  user: { id: string; email: string; name: string | null };
}): Promise<OrderNotifyTarget | null> {
  const guestUserId = await getMarketplaceSystemGuestUserId();
  if (order.user.id === guestUserId) {
    const email = (order.email ?? '').trim();
    if (!email) return null;
    return {
      email,
      name: displayNameFromEmail(email),
      trackUrl: orderTrackUrl(order.orderCode, true),
      isGuest: true,
    };
  }
  if (!order.user.email) return null;
  return {
    email: order.user.email,
    name: order.user.name ?? 'there',
    trackUrl: orderTrackUrl(order.orderCode, false),
    isGuest: false,
  };
}
