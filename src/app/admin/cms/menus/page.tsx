import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { MenuManager } from './MenuManager';

export const dynamic = 'force-dynamic';

const STATIC_PAGE_OPTIONS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'marketplace', label: 'Marketplace', href: '/marketplace' },
  { id: 'services', label: 'Services', href: '/services' },
  { id: 'imei-services', label: 'IMEI Services', href: '/services/imei' },
  { id: 'server-services', label: 'Server Services', href: '/services/server' },
  { id: 'track-order', label: 'Track Order', href: '/track' },
  { id: 'login', label: 'Login', href: '/login' },
  { id: 'register', label: 'Register', href: '/register' },
];

export default async function MenusPage() {
  const [items, customPages] = await Promise.all([
    prisma.navigationMenu.findMany({
      orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.customPage.findMany({
      orderBy: [{ title: 'asc' }],
      select: { id: true, slug: true, title: true, isPublished: true },
    }),
  ]);

  const pageOptions = [
    ...STATIC_PAGE_OPTIONS.map((page) => ({
      id: `static:${page.id}`,
      label: page.label,
      href: page.href,
    })),
    ...customPages.map((page) => ({
      id: `custom:${page.id}`,
      label: page.isPublished ? page.title : `${page.title} (draft)`,
      href: `/${page.slug}`,
    })),
  ];

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
        pageOptions={pageOptions}
      />
    </div>
  );
}
