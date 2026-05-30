import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { parseAttachments } from '@/lib/ticket-service';
import { PageHeader } from '@/components/ui/PageHeader';
import { TicketThread } from './TicketThread';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function UserTicketDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/user/tickets/${id}`);

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: session.user.id },
    include: {
      replies: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket) notFound();

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

  return (
    <div className="max-w-4xl">
      <PageHeader
        section={`§ Ticket · ${ticket.ticketCode}`}
        title={ticket.subject}
        subtitle={`${ticket.category} · priority ${ticket.priority} · status ${ticket.status}`}
      />
      <TicketThread
        ticketId={ticket.id}
        ticketCode={ticket.ticketCode}
        status={ticket.status}
        linkedOrderCode={linkedOrderCode}
        canReply={ticket.status !== 'CLOSED'}
        canResolve={['OPEN', 'AWAITING_USER', 'AWAITING_ADMIN'].includes(ticket.status)}
        replies={ticket.replies.map((r) => ({
          id: r.id,
          authorRole: r.authorRole as 'USER' | 'ADMIN' | 'SYSTEM',
          body: r.body,
          isSystem: r.isSystem,
          attachments: parseAttachments(r.attachments),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
