import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

/** Internal-only user for guest marketplace payments (no per-guest accounts). */
export const MARKETPLACE_SYSTEM_GUEST_EMAIL = 'marketplace-guest@system.internal';

export function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Guest';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 48);
}

let cachedGuestUserId: string | null = null;

export async function getMarketplaceSystemGuestUserId(): Promise<string> {
  if (cachedGuestUserId) return cachedGuestUserId;

  let user = await prisma.user.findUnique({
    where: { email: MARKETPLACE_SYSTEM_GUEST_EMAIL },
    select: { id: true },
  });

  if (!user) {
    const hashed = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    user = await prisma.user.create({
      data: {
        email: MARKETPLACE_SYSTEM_GUEST_EMAIL,
        name: 'Marketplace Guest',
        password: hashed,
        role: 'USER',
      },
      select: { id: true },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
  }

  cachedGuestUserId = user.id;
  return user.id;
}

export type MarketplaceCheckoutActor = {
  userId: string;
  contactEmail: string;
  contactName: string;
  isRegistered: boolean;
};

/**
 * Resolve checkout actor: link to existing account when email is registered,
 * otherwise use the internal guest user (no new User row per checkout).
 */
export async function resolveMarketplaceCheckoutActor(email: string): Promise<MarketplaceCheckoutActor> {
  const normalized = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, email: true },
  });

  if (existing) {
    await prisma.wallet.upsert({
      where: { userId: existing.id },
      update: {},
      create: { userId: existing.id, balance: 0 },
    });
    return {
      userId: existing.id,
      contactEmail: existing.email,
      contactName: existing.name ?? displayNameFromEmail(normalized),
      isRegistered: true,
    };
  }

  const guestUserId = await getMarketplaceSystemGuestUserId();
  return {
    userId: guestUserId,
    contactEmail: normalized,
    contactName: displayNameFromEmail(normalized),
    isRegistered: false,
  };
}

export async function isMarketplaceSystemGuestUser(userId: string): Promise<boolean> {
  const guestId = await getMarketplaceSystemGuestUserId();
  return userId === guestId;
}
