import { prisma } from '@/lib/db';
import { NavbarClient } from './NavbarClient';

const FALLBACK = [
  { id: 'l0', label: 'Marketplace', href: '/marketplace' },
  { id: 'l1', label: 'Catalog', href: '#catalog' },
  { id: 'l2', label: 'How it works', href: '#how-to-order' },
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

  const baseItems =
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
      items={baseItems}
      siteName={settings?.siteName ?? 'Nexus Server'}
      tagline={settings?.siteTagline ?? 'Unlock Service Portal'}
      logoUrl={settings?.logoUrl ?? null}
    />
  );
}
