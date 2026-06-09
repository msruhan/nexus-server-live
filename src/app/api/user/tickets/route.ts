import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth';
import {
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  appendReply,
  generateTicketCode,
  resolveOrderLink,
  type TicketCategory,
  type TicketPriority,
} from '@/lib/ticket-service';
import { logActivity } from '@/lib/activity';
import { notifyTelegramAdminNewTicket } from '@/lib/telegram/notify';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(8000),
  category: z.enum(ALLOWED_CATEGORIES as unknown as [TicketCategory, ...TicketCategory[]]).optional(),
  priority: z.enum(ALLOWED_PRIORITIES as unknown as [TicketPriority, ...TicketPriority[]]).optional(),
  imeiOrderId: z.string().cuid().nullable().optional(),
  serverOrderId: z.string().cuid().nullable().optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100);

  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      ticketCode: true,
      subject: true,
      category: true,
      priority: true,
      status: true,
      lastReplyAt: true,
      lastReplyBy: true,
      imeiOrderId: true,
      serverOrderId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { replies: true } },
    },
  });
  return apiSuccess(tickets);
}

export async function POST(req: Request) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid payload');
  }

  let link: Awaited<ReturnType<typeof resolveOrderLink>>;
  try {
    link = await resolveOrderLink({
      userId: session.user.id,
      imeiOrderId: parsed.data.imeiOrderId ?? null,
      serverOrderId: parsed.data.serverOrderId ?? null,
    });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Invalid order link', 400);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketCode: generateTicketCode(),
      userId: session.user.id,
      subject: parsed.data.subject,
      category: parsed.data.category ?? 'general',
      priority: parsed.data.priority ?? 'normal',
      imeiOrderId: link.imeiOrderId,
      serverOrderId: link.serverOrderId,
    },
  });

  // First message body becomes the initial reply.
  await appendReply({
    ticketId: ticket.id,
    authorId: session.user.id,
    authorRole: 'USER',
    body: parsed.data.body,
  });

  if (link.orderCode) {
    await appendReply({
      ticketId: ticket.id,
      authorId: null,
      authorRole: 'SYSTEM',
      body: `Linked to order ${link.orderCode}.`,
      isSystem: true,
    });
  }

  await logActivity({
    userId: session.user.id,
    action: 'ticket.created',
    entity: 'SupportTicket',
    entityId: ticket.id,
    metadata: {
      ticketCode: ticket.ticketCode,
      category: ticket.category,
      priority: ticket.priority,
      imeiOrderId: link.imeiOrderId,
      serverOrderId: link.serverOrderId,
    },
  });

  // Fire-and-forget Telegram admin notification
  void notifyTelegramAdminNewTicket({
    ticketCode: ticket.ticketCode,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    subject: parsed.data.subject,
  });
  void import('@/lib/email/notify').then(({ notifyAdminNewTicket }) =>
    notifyAdminNewTicket({
      ticketCode: ticket.ticketCode,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      subject: parsed.data.subject,
      ticketId: ticket.id,
    }),
  );

  return apiSuccess(
    {
      id: ticket.id,
      ticketCode: ticket.ticketCode,
    },
    201,
  );
}
