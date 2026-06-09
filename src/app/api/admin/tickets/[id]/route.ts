import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth';
import {
  ALLOWED_PRIORITIES,
  ALLOWED_STATUSES,
  appendReply,
  parseAttachments,
  type TicketPriority,
  type TicketStatus,
  transitionStatus,
} from '@/lib/ticket-service';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!ticket) return apiError('Ticket not found', 404);

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
    ...ticket,
    linkedOrderCode,
    replies: ticket.replies.map((r) => ({
      ...r,
      attachments: parseAttachments(r.attachments),
    })),
  });
}

const patchSchema = z.object({
  status: z
    .enum(ALLOWED_STATUSES as unknown as [TicketStatus, ...TicketStatus[]])
    .optional(),
  priority: z
    .enum(ALLOWED_PRIORITIES as unknown as [TicketPriority, ...TicketPriority[]])
    .optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true, ticketCode: true },
  });
  if (!ticket) return apiError('Ticket not found', 404);

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');

  const data: Record<string, unknown> = {};
  let nextStatus: TicketStatus | null = null;

  if (parsed.data.status) {
    nextStatus = transitionStatus(
      ticket.status as TicketStatus,
      parsed.data.status,
      'ADMIN',
    );
    if (!nextStatus) return apiError('Invalid status transition', 400);
    data.status = nextStatus;
    if (nextStatus === 'CLOSED') {
      data.closedAt = new Date();
      data.closedBy = session.user.id;
    } else if (ticket.status === 'CLOSED' && nextStatus === 'OPEN') {
      data.closedAt = null;
      data.closedBy = null;
    }
  }
  if (parsed.data.priority) data.priority = parsed.data.priority;

  if (Object.keys(data).length === 0) return apiError('No changes provided', 400);

  await prisma.supportTicket.update({ where: { id }, data });

  if (nextStatus) {
    await appendReply({
      ticketId: id,
      authorId: null,
      authorRole: 'SYSTEM',
      body: `Status changed to ${nextStatus} by admin.`,
      isSystem: true,
    });
    void import('@/lib/email/notify').then(({ notifyTicketStatusChanged }) =>
      notifyTicketStatusChanged({
        ticketId: id,
        previousStatus: ticket.status,
        newStatus: nextStatus,
      }),
    );
  }

  await logActivity({
    userId: session.user.id,
    action: 'ticket.updated',
    entity: 'SupportTicket',
    entityId: id,
    metadata: {
      ticketCode: ticket.ticketCode,
      changed: Object.keys(data),
    },
  });

  return apiSuccess({ updated: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiRole(['ADMIN']);
  if (error) return error;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, ticketCode: true },
  });
  if (!ticket) return apiError('Ticket not found', 404);

  try {
    await prisma.supportTicket.delete({ where: { id } });
    await logActivity({
      userId: session.user.id,
      action: 'ticket.deleted',
      entity: 'SupportTicket',
      entityId: id,
      metadata: { ticketCode: ticket.ticketCode },
    });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('[ADMIN_TICKET_DELETE]', e);
    return apiError('Failed to delete ticket', 500);
  }
}
