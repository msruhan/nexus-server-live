import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { appendReply } from '@/lib/ticket-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/tickets/:id/resolve
 *
 * User-initiated soft close. Marks the ticket as RESOLVED and posts a
 * SYSTEM reply documenting it. Admins can still reopen via their endpoint.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!ticket) return apiError('Ticket not found', 404);
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return apiError('Ticket is already resolved or closed.', 400);
  }

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'RESOLVED' },
  });
  await appendReply({
    ticketId: ticket.id,
    authorId: null,
    authorRole: 'SYSTEM',
    body: 'User marked this ticket as resolved.',
    isSystem: true,
  });

  return apiSuccess({ resolved: true });
}
