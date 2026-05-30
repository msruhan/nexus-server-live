import { prisma } from '@/lib/db';

/** Ticket statuses that need an admin reply or first response. */
export const ADMIN_ACTION_TICKET_STATUSES = ['OPEN', 'AWAITING_ADMIN'] as const;

export async function getAdminNavBadges(): Promise<Record<string, number>> {
  const pendingTickets = await prisma.supportTicket.count({
    where: { status: { in: [...ADMIN_ACTION_TICKET_STATUSES] } },
  });

  if (pendingTickets === 0) return {};

  return { '/admin/tickets': pendingTickets };
}
