import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { parseAttachments } from '@/lib/ticket-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/tickets/:id
 *
 * Returns the ticket plus its full reply thread for the authenticated
 * owner. Admin-only fields (closedBy etc.) are omitted from this view.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: session.user.id },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          authorRole: true,
          body: true,
          attachments: true,
          isSystem: true,
          createdAt: true,
        },
      },
    },
  });
  if (!ticket) return apiError('Ticket not found', 404);

  // Resolve linked order code if present (read-only).
  let linkedOrderCode: string | null = null;
  if (ticket.imeiOrderId) {
    const o = await prisma.imeiOrder.findUnique({
      where: { id: ticket.imeiOrderId },
      select: { orderCode: true },
    });
    linkedOrderCode = o?.orderCode ?? null;
  } else if (ticket.serverOrderId) {
    const o = await prisma.serverOrder.findUnique({
      where: { id: ticket.serverOrderId },
      select: { orderCode: true },
    });
    linkedOrderCode = o?.orderCode ?? null;
  }

  return apiSuccess({
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    imeiOrderId: ticket.imeiOrderId,
    serverOrderId: ticket.serverOrderId,
    linkedOrderCode,
    lastReplyAt: ticket.lastReplyAt,
    lastReplyBy: ticket.lastReplyBy,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    replies: ticket.replies.map((r) => ({
      ...r,
      attachments: parseAttachments(r.attachments),
    })),
  });
}
