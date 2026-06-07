import type { Session } from 'next-auth';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NavbarClient, type NavbarAuth } from './NavbarClient';

const FALLBACK = [
  { id: 'l0', label: 'Marketplace', href: '/marketplace' },
  { id: 'l1', label: 'Catalog', href: '#catalog' },
  { id: 'l2', label: 'How it works', href: '#how-to-order' },
  { id: 'l3', label: 'Track order', href: '/track' },
  { id: 'l4', label: 'Ledger', href: '#ledger' },
  { id: 'l5', label: 'Voices', href: '#voices' },
  { id: 'l6', label: 'Notes', href: '#notes' },
];

function resolveNavbarAuth(session: Session | null): NavbarAuth {
  if (!session?.user) return { kind: 'guest' };
  const role = session.user.role;
  if (role === 'ADMIN' || role === 'SUB_ADMIN') {
    return {
      kind: 'authenticated',
      href: '/admin/dashboard',
      label: 'Admin',
      name: session.user.name,
    };
  }
  return {
    kind: 'authenticated',
    href: '/user/dashboard',
    label: 'Dashboard',
    name: session.user.name,
  };
}

export async function Navbar() {
  const [menus, settings, session] = await Promise.all([
    prisma.navigationMenu.findMany({
      where: { location: 'header', isVisible: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
    auth(),
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
      siteName={settings?.siteName ?? 'Recovero'}
      tagline={settings?.siteTagline ?? 'Unlock Service Portal'}
      logoUrl={settings?.logoUrl ?? null}
      authNav={resolveNavbarAuth(session)}
    />
  );
}
