/**
 * Support ticket service helpers.
 *
 * All functions are PURE additions to the codebase — they never reach
 * into the order workflow. Order references are stored as opaque ids
 * with no FK relations so that ticket lifecycle cannot affect orders.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type TicketStatus = 'OPEN' | 'AWAITING_USER' | 'AWAITING_ADMIN' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'order' | 'billing' | 'technical';
export type ReplyAuthorRole = 'USER' | 'ADMIN' | 'SYSTEM';

export type TicketAttachment = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

export const ALLOWED_STATUSES: readonly TicketStatus[] = [
  'OPEN',
  'AWAITING_USER',
  'AWAITING_ADMIN',
  'RESOLVED',
  'CLOSED',
];

export const ALLOWED_PRIORITIES: readonly TicketPriority[] = ['low', 'normal', 'high', 'urgent'];
export const ALLOWED_CATEGORIES: readonly TicketCategory[] = [
  'general',
  'order',
  'billing',
  'technical',
];

export function generateTicketCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TCK-${year}-${rand}`;
}

/**
 * Validate that the provided order id (if any) actually belongs to the
 * user creating the ticket. Returns null if no order link, the link
 * detail if valid, or throws if the link is invalid.
 *
 * We deliberately query order tables read-only here; we do not lock or
 * mutate them.
 */
export async function resolveOrderLink(input: {
  userId: string;
  imeiOrderId?: string | null;
  serverOrderId?: string | null;
}): Promise<{
  imeiOrderId: string | null;
  serverOrderId: string | null;
  orderCode: string | null;
}> {
  if (input.imeiOrderId && input.serverOrderId) {
    throw new Error('Ticket can be linked to one order only.');
  }
  if (input.imeiOrderId) {
    const order = await prisma.imeiOrder.findFirst({
      where: { id: input.imeiOrderId, userId: input.userId },
      select: { id: true, orderCode: true },
    });
    if (!order) throw new Error('Linked IMEI order not found or not owned by user.');
    return { imeiOrderId: order.id, serverOrderId: null, orderCode: order.orderCode };
  }
  if (input.serverOrderId) {
    const order = await prisma.serverOrder.findFirst({
      where: { id: input.serverOrderId, userId: input.userId },
      select: { id: true, orderCode: true },
    });
    if (!order) throw new Error('Linked server order not found or not owned by user.');
    return { imeiOrderId: null, serverOrderId: order.id, orderCode: order.orderCode };
  }
  return { imeiOrderId: null, serverOrderId: null, orderCode: null };
}

export function serializeAttachments(attachments?: TicketAttachment[] | null): string | null {
  if (!attachments || attachments.length === 0) return null;
  return JSON.stringify(attachments);
}

export function parseAttachments(raw: string | null | undefined): TicketAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x: unknown): x is TicketAttachment => {
        if (!x || typeof x !== 'object') return false;
        const a = x as Record<string, unknown>;
        return (
          typeof a.url === 'string' &&
          typeof a.filename === 'string' &&
          typeof a.mimeType === 'string' &&
          typeof a.size === 'number'
        );
      })
      .slice(0, 10); // hard cap
  } catch {
    return [];
  }
}

/**
 * Append a reply and update ticket status accordingly. We always run this
 * in a transaction so that ticket+reply mutate atomically.
 *
 * Status transitions (intentionally simple):
 *   USER replies   → AWAITING_ADMIN
 *   ADMIN replies  → AWAITING_USER
 *   SYSTEM replies → no status change
 */
export async function appendReply(input: {
  ticketId: string;
  authorId: string | null;
  authorRole: ReplyAuthorRole;
  body: string;
  attachments?: TicketAttachment[];
  isSystem?: boolean;
}) {
  const trimmed = input.body.trim();
  if (!input.isSystem && !trimmed) {
    throw new Error('Reply body is empty.');
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { id: input.ticketId },
      select: { id: true, status: true },
    });
    if (!ticket) throw new Error('Ticket not found.');
    if (ticket.status === 'CLOSED') {
      throw new Error('This ticket is closed.');
    }

    const reply = await tx.supportTicketReply.create({
      data: {
        ticketId: input.ticketId,
        authorId: input.authorId,
        authorRole: input.authorRole,
        body: trimmed,
        attachments: serializeAttachments(input.attachments),
        isSystem: !!input.isSystem,
      },
    });

    let nextStatus: TicketStatus | null = null;
    if (!input.isSystem) {
      if (input.authorRole === 'USER') nextStatus = 'AWAITING_ADMIN';
      else if (input.authorRole === 'ADMIN') nextStatus = 'AWAITING_USER';
    }

    const data: Prisma.SupportTicketUpdateInput = {
      lastReplyAt: reply.createdAt,
      lastReplyBy: input.isSystem ? 'SYSTEM' : input.authorRole,
    };
    if (nextStatus) data.status = nextStatus;

    await tx.supportTicket.update({ where: { id: input.ticketId }, data });
    return reply;
  });
}

export function transitionStatus(
  current: TicketStatus,
  target: TicketStatus,
  actorRole: 'USER' | 'ADMIN',
): TicketStatus | null {
  if (current === 'CLOSED' && target !== 'OPEN') return null;
  if (target === 'CLOSED' && actorRole !== 'ADMIN') return null;
  if (target === current) return null;
  return target;
}
