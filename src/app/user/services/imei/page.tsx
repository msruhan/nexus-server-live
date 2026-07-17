import { prisma } from '@/lib/db'
import { ServiceStatus } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { PublicServicesTable } from '@/app/(public)/services/components/PublicServicesTable'

export const dynamic = 'force-dynamic'

export default async function UserImeiServicesPage() {
  const services = await prisma.imeiService.findMany({
    where: { status: ServiceStatus.ACTIVE },
    orderBy: [
      { group: { sortOrder: 'asc' } },
      { group: { title: 'asc' } },
      { price: 'asc' },
      { title: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      deliveryTime: true,
      price: true,
      group: { select: { id: true, title: true } },
    },
  })

  return (
    <div>
      <PageHeader
        section="§ Services"
        title={
          <>
            IMEI <span className="font-serif italic font-normal">services</span>.
          </>
        }
        subtitle="Browse available IMEI services, then submit your order."
      />

      <PublicServicesTable
        rows={services.map((s) => ({
          id: s.id,
          type: 'imei' as const,
          title: s.title,
          description: s.description,
          deliveryTime: s.deliveryTime,
          price: Number(s.price),
          groupId: s.group.id,
          groupTitle: s.group.title,
        }))}
      />
    </div>
  )
}

