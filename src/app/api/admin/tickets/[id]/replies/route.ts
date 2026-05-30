import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import { appendReply } from '@/lib/ticket-service';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const replySchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true, ticketCode: true },
  });
  if (!ticket) return apiError('Ticket not found', 404);
  if (ticket.status === 'CLOSED') return apiError('Ticket is closed.', 400);

  const parsed = replySchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const reply = await appendReply({
      ticketId: ticket.id,
      authorId: session.user.id,
      authorRole: 'ADMIN',
      body: parsed.data.body,
    });
    await logActivity({
      userId: session.user.id,
      action: 'ticket.replied',
      entity: 'SupportTicket',
      entityId: ticket.id,
      metadata: { ticketCode: ticket.ticketCode, replyId: reply.id },
    });
    // Email notification — fire-and-forget so SMTP issues never affect
    // the admin reply UI.
    void import('@/lib/email/notify').then(({ notifyTicketReply }) =>
      notifyTicketReply({ ticketId: ticket.id, replyAuthorRole: 'ADMIN' }),
    );
    return apiSuccess({ id: reply.id }, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Failed to reply', 400);
  }
}
