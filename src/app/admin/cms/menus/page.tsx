import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { MenuManager } from './MenuManager';

export const dynamic = 'force-dynamic';

export default async function MenusPage() {
  const items = await prisma.navigationMenu.findMany({
    orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }],
  });
  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Navigation <span className="font-serif italic font-normal">menus</span>.
          </>
        }
        subtitle="Header, footer, mobile · drag to reorder."
      />
      <MenuManager
        initial={items.map((m) => ({
          id: m.id,
          location: m.location,
          label: m.label,
          href: m.href,
          icon: m.icon,
          isExternal: m.isExternal,
          isVisible: m.isVisible,
        }))}
      />
    </div>
  );
}
