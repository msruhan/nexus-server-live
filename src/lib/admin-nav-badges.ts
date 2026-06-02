import { prisma } from '@/lib/db';
import { OrderStatus, TopupStatus } from '@/lib/constants';

/** Ticket statuses that need an admin reply or first response. */
export const ADMIN_ACTION_TICKET_STATUSES = ['OPEN', 'AWAITING_ADMIN'] as const;

/** Sidebar href → pending count for admin menu badges. */
export async function getAdminNavBadges(): Promise<Record<string, number>> {
  const [pendingTickets, pendingTopups, pendingImeiOrders, pendingServerOrders] =
    await Promise.all([
      prisma.supportTicket.count({
        where: { status: { in: [...ADMIN_ACTION_TICKET_STATUSES] } },
      }),
      prisma.topupRequest.count({
        where: { status: TopupStatus.PENDING },
      }),
      prisma.imeiOrder.count({
        where: { status: OrderStatus.PENDING },
      }),
      prisma.serverOrder.count({
        where: { status: OrderStatus.PENDING },
      }),
    ]);

  const badges: Record<string, number> = {};

  const pendingOrders = pendingImeiOrders + pendingServerOrders;
  if (pendingOrders > 0) {
    badges['/admin/orders'] = pendingOrders;
  }

  if (pendingTopups > 0) {
    badges['/admin/wallet'] = pendingTopups;
  }

  if (pendingTickets > 0) {
    badges['/admin/tickets'] = pendingTickets;
  }

  return badges;
}
