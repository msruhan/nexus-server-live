import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { FaqManager } from './FaqManager';

export const dynamic = 'force-dynamic';

export default async function FaqPage() {
  const items = await prisma.faqItem.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            FAQ <span className="font-serif italic font-normal">items</span>.
          </>
        }
        subtitle="Group by category, hide individual entries, edit Q&amp;A."
      />
      <FaqManager
        initial={items.map((i) => ({
          id: i.id,
          category: i.category,
          question: i.question,
          answer: i.answer,
          isVisible: i.isVisible,
        }))}
      />
    </div>
  );
}
