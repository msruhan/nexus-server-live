import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { NewTicketForm } from './NewTicketForm';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ imei?: string; server?: string }>;
};

export default async function NewTicketPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/user/tickets/new');

  const params = await searchParams;

  // Fetch the user's recent orders to populate the link picker.
  const [imeiOrders, serverOrders] = await Promise.all([
    prisma.imeiOrder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        orderCode: true,
        status: true,
        service: { select: { title: true } },
      },
    }),
    prisma.serverOrder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        orderCode: true,
        status: true,
        service: { select: { title: true } },
      },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Support · new"
        title={
          <>
            Open a <span className="font-serif italic font-normal">ticket</span>.
          </>
        }
        subtitle="Describe the issue. Attach an order if relevant — we'll see context faster."
      />
      <NewTicketForm
        imeiOrders={imeiOrders.map((o) => ({
          id: o.id,
          label: `${o.orderCode} — ${o.service?.title ?? '—'} · ${o.status}`,
        }))}
        serverOrders={serverOrders.map((o) => ({
          id: o.id,
          label: `${o.orderCode} — ${o.service?.title ?? '—'} · ${o.status}`,
        }))}
        defaultImeiOrderId={params.imei ?? null}
        defaultServerOrderId={params.server ?? null}
      />
    </div>
  );
}
