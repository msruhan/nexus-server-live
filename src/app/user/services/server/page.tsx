import { prisma } from '@/lib/db'
import { ServiceStatus } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { PublicServicesTable } from '@/app/(public)/services/components/PublicServicesTable'

export const dynamic = 'force-dynamic'

export default async function UserServerServicesPage() {
  const services = await prisma.serverService.findMany({
    where: { status: ServiceStatus.ACTIVE },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      deliveryTime: true,
      price: true,
      box: { select: { id: true, title: true } },
    },
  })

  return (
    <div>
      <PageHeader
        section="§ Services"
        title={
          <>
            Server <span className="font-serif italic font-normal">services</span>.
          </>
        }
        subtitle="Browse available server services, then submit your order."
      />

      <PublicServicesTable
        rows={services.map((s) => ({
          id: s.id,
          type: 'server' as const,
          title: s.title,
          description: s.description,
          deliveryTime: s.deliveryTime,
          price: Number(s.price),
          groupId: s.box.id,
          groupTitle: s.box.title,
        }))}
      />
    </div>
  )
}

