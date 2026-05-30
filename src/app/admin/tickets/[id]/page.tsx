import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseAttachments } from '@/lib/ticket-service';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminTicketThread } from './AdminTicketThread';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function AdminTicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket) notFound();

  let linkedOrderCode: string | null = null;
  let linkedOrderId: string | null = null;
  let linkedOrderType: 'imei' | 'server' | null = null;

  if (ticket.imeiOrderId) {
    const o = await prisma.imeiOrder.findUnique({
      where: { id: ticket.imeiOrderId },
      select: { orderCode: true },
    });
    linkedOrderCode = o?.orderCode ?? null;
    linkedOrderId = ticket.imeiOrderId;
    linkedOrderType = 'imei';
  } else if (ticket.serverOrderId) {
    const o = await prisma.serverOrder.findUnique({
      where: { id: ticket.serverOrderId },
      select: { orderCode: true },
    });
    linkedOrderCode = o?.orderCode ?? null;
    linkedOrderId = ticket.serverOrderId;
    linkedOrderType = 'server';
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        section={`§ Admin · ticket · ${ticket.ticketCode}`}
        title={ticket.subject}
        subtitle={`${ticket.user?.email} · ${ticket.category} · priority ${ticket.priority}`}
      />
      <AdminTicketThread
        ticketId={ticket.id}
        ticketCode={ticket.ticketCode}
        status={ticket.status}
        priority={ticket.priority}
        linkedOrderCode={linkedOrderCode}
        linkedOrderId={linkedOrderId}
        linkedOrderType={linkedOrderType}
        userEmail={ticket.user?.email ?? ''}
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
