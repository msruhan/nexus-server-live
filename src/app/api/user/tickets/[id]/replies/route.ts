import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import { appendReply } from '@/lib/ticket-service';

export const dynamic = 'force-dynamic';

const replySchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });
  if (!ticket) return apiError('Ticket not found', 404);
  if (ticket.status === 'CLOSED') return apiError('Ticket is closed.', 400);

  const parsed = replySchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  try {
    const reply = await appendReply({
      ticketId: ticket.id,
      authorId: session.user.id,
      authorRole: 'USER',
      body: parsed.data.body,
    });
    return apiSuccess({ id: reply.id }, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Failed to reply', 400);
  }
}
