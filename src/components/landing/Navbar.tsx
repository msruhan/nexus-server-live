import { prisma } from '@/lib/db';
import { NavbarClient } from './NavbarClient';

const FALLBACK = [
  { id: 'l1', label: 'Catalog', href: '#catalog' },
  { id: 'l2', label: 'Method', href: '#method' },
  { id: 'l3', label: 'Track order', href: '/track' },
  { id: 'l4', label: 'Ledger', href: '#ledger' },
  { id: 'l5', label: 'Voices', href: '#voices' },
  { id: 'l6', label: 'Notes', href: '#notes' },
];

export async function Navbar() {
  const [menus, settings] = await Promise.all([
    prisma.navigationMenu.findMany({
      where: { location: 'header', isVisible: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const items =
    menus.length > 0
      ? menus.map((m) => ({
          id: m.id,
          label: m.label,
          href: m.href,
          isExternal: m.isExternal,
        }))
      : FALLBACK.map((m) => ({ ...m, isExternal: false }));

  return (
    <NavbarClient
      items={items}
      siteName={settings?.siteName ?? 'Nexus Server'}
      tagline={settings?.siteTagline ?? 'IMEI · Server Bureau'}
    />
  );
}
