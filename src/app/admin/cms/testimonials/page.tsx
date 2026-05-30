import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { TestimonialManager } from './TestimonialManager';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const items = await prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Reseller <span className="font-serif italic font-normal">voices</span>.
          </>
        }
        subtitle="Real stories from the desk · name, role, rating, content."
      />
      <TestimonialManager
        initial={items.map((t) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          avatar: t.avatar,
          rating: t.rating,
          content: t.content,
          isVisible: t.isVisible,
        }))}
      />
    </div>
  );
}
