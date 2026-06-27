'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import {
  House,
  ListChecks,
  Wallet,
  GearSix,
  Key,
  CaretDown,
  CaretLeft,
  CaretRight,
  X,
  SignOut,
  Database,
  ChartLineUp,
  Users,
  Package,
  Receipt,
  Scroll,
  Buildings,
  Layout,
  Image as ImageIcon,
  TextAa,
  ListBullets,
  Question,
  ChatTeardrop,
  Folders,
  FilePlus,
  Palette,
  ChatCircleDots,
  Tag,
  CurrencyCircleDollar,
  Envelope,
  DownloadSimple,
  UsersThree,
  Warning,
  TelegramLogo,
  ArrowsClockwise,
  ChartBar,
  Broadcast,
  Archive,
  Rows,
  Shield,
  Copy,
} from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';
import { formatAppVersion } from '@/lib/app-version';
import { SidebarMobileNavProvider } from '@/components/dashboard/sidebar-mobile-context';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import type { Icon } from '@phosphor-icons/react';

type Item = {
  href?: string;
  label: string;
  icon: Icon;
  /** Permission key required to see this item (SUB_ADMIN). Omit = always visible to admins. */
  perm?: string;
  children?: Array<{ href: string; label: string; icon: Icon; perm?: string }>;
};

type Section = {
  title: string;
  items: Item[];
};

const userSections: Section[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/user/dashboard', label: 'Dashboard', icon: House },
      {
        label: 'Orders',
        icon: ListChecks,
        children: [
          { href: '/user/orders/imei', label: 'Order IMEI', icon: ListChecks },
          { href: '/user/orders/server', label: 'Order Server', icon: Buildings },
        ],
      },
      { href: '/user/wallet', label: 'Wallet', icon: Wallet },
      { href: '/user/invoices', label: 'Invoices', icon: Receipt },
      { href: '/user/download-tools', label: 'Download tools', icon: DownloadSimple },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/user/services/imei', label: 'IMEI services', icon: ListChecks },
      { href: '/user/services/server', label: 'Server services', icon: Buildings },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/user/settings', label: 'Settings', icon: GearSix },
      { href: '/user/appearance', label: 'Palette & theme', icon: Palette },
      { href: '/user/api-keys', label: 'API keys', icon: Key },
      { href: '/user/webhooks', label: 'Webhooks', icon: Broadcast },
      { href: '/user/tickets', label: 'Support', icon: ChatCircleDots },
    ],
  },
];

const adminSections: Section[] = [
  {
    title: 'Operations',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: ChartLineUp, perm: 'viewDashboard' },
      { href: '/admin/reports', label: 'Reports', icon: ChartBar, perm: 'viewReports' },
      { href: '/admin/orders', label: 'Orders', icon: Package, perm: 'viewImeiOrders' },
      { href: '/admin/wallet', label: 'Top-up requests', icon: Receipt, perm: 'viewWalletTopups' },
      { href: '/admin/payments', label: 'Payment gateways', icon: CurrencyCircleDollar, perm: 'managePaymentGateways' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/providers', label: 'API providers', icon: Database, perm: 'viewProviders' },
      { href: '/admin/services/groups', label: 'Group services', icon: Folders, perm: 'manageServiceGroups' },
      { href: '/admin/services/imei', label: 'IMEI services', icon: ListChecks, perm: 'viewImeiServices' },
      { href: '/admin/services/server', label: 'Server services', icon: Buildings, perm: 'viewServerServices' },
      { href: '/admin/services/duplicates', label: 'Duplicates', icon: Copy, perm: 'viewImeiServices' },
      { href: '/admin/price-groups', label: 'User groups', icon: Tag, perm: 'managePriceGroups' },
    ],
  },
  {
    title: 'People & support',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, perm: 'viewUsers' },
      { href: '/admin/sub-admins', label: 'Sub admins', icon: UsersThree, perm: 'manageSubAdmins' },
      { href: '/admin/tickets', label: 'Support tickets', icon: ChatCircleDots, perm: 'viewTickets' },
    ],
  },
  {
    title: 'Security & logs',
    items: [
      { href: '/admin/logs', label: 'Activity log', icon: Scroll, perm: 'viewActivityLog' },
      { href: '/admin/audit', label: 'Staff audit', icon: Shield, perm: 'viewActivityLog' },
      { href: '/admin/api-keys', label: 'API keys', icon: Key, perm: 'manageApiKeys' },
      { href: '/admin/ip-management', label: 'IP management', icon: Shield, perm: 'manageApiKeys' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { href: '/admin/email', label: 'Email / SMTP', icon: Envelope, perm: 'manageEmailSettings' },
      { href: '/admin/cms/email-templates', label: 'Email templates', icon: Envelope, perm: 'editCms' },
      { href: '/admin/telegram', label: 'Telegram bot', icon: TelegramLogo, perm: 'manageTelegram' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/admin/system', label: 'License & Update', icon: ArrowsClockwise, perm: 'manageSystem' },
      { href: '/admin/backup', label: 'Database backup', icon: Archive, perm: 'manageBackups' },
      { href: '/admin/maintenance', label: 'Maintenance mode', icon: Warning, perm: 'editSettings' },
      { href: '/admin/settings', label: 'Settings', icon: GearSix, perm: 'viewSettings' },
      { href: '/admin/appearance', label: 'Palette & theme', icon: Palette },
      { href: '/admin/download-tools', label: 'Download tools', icon: DownloadSimple, perm: 'editCms' },
    ],
  },
  {
    title: 'CMS',
    items: [
      { href: '/admin/cms', label: 'CMS overview', icon: Palette, perm: 'viewCms' },
      { href: '/admin/cms/landing-builder', label: 'Landing builder', icon: Layout, perm: 'editCms' },
      { href: '/admin/cms/banners', label: 'Banners', icon: ImageIcon, perm: 'editCms' },
      { href: '/admin/cms/running-ads', label: 'Running ads', icon: TextAa, perm: 'editCms' },
      { href: '/admin/cms/announcements', label: 'Announcements', icon: Broadcast, perm: 'editCms' },
      { href: '/admin/cms/menus', label: 'Menus', icon: ListBullets, perm: 'editCms' },
      { href: '/admin/cms/footer', label: 'Footer', icon: Rows, perm: 'editCms' },
      { href: '/admin/cms/faq', label: 'FAQ', icon: Question, perm: 'editCms' },
      { href: '/admin/cms/testimonials', label: 'Testimonials', icon: ChatTeardrop, perm: 'editCms' },
      { href: '/admin/cms/pages', label: 'Custom pages', icon: FilePlus, perm: 'editCms' },
      { href: '/admin/cms/media', label: 'Media library', icon: Folders, perm: 'editCms' },
    ],
  },
];

const SIDEBAR_STORAGE_KEY = 'nexus-sidebar-open';
const SIDEBAR_WIDTH_CLASS = 'w-64'; // 16rem — keep in sync with lg:ml-64 on main

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none tabular-nums',
        active ? 'bg-primary-400 text-ink' : 'bg-red-600 text-white',
      )}
      aria-label={`${count} pending`}
    >
      {label}
    </span>
  );
}

const licenseLockdownSections: Section[] = [
  {
    title: 'License',
    items: [{ href: '/admin/system', label: 'License & Update', icon: ArrowsClockwise }],
  },
];

export function Sidebar({
  variant,
  user,
  navBadges,
  permissions,
  brand,
  licenseLockdown,
  children,
}: {
  variant: 'user' | 'admin';
  user: { name: string; email: string; role: string };
  /** Map of sidebar href → pending count (admin only). */
  navBadges?: Record<string, number>;
  /** Sub-admin permission map (perm key → boolean). Null/undefined = full admin. */
  permissions?: Record<string, boolean> | null;
  /** White-label brand identity for the sidebar header. */
  brand?: { siteName: string; logoUrl: string | null };
  /** When license runtime is locked, only show the system page in admin nav. */
  licenseLockdown?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSubAdmin = user.role === 'SUB_ADMIN';

  // Filter admin sections by permission for SUB_ADMIN. ADMIN sees everything.
  const rawSections =
    variant === 'admin' && licenseLockdown
      ? licenseLockdownSections
      : variant === 'admin'
        ? adminSections
        : userSections;
  const sections = React.useMemo(() => {
    if (licenseLockdown || variant !== 'admin' || !isSubAdmin) return rawSections;
    const can = (perm?: string) => !perm || permissions?.[perm] === true;
    return rawSections
      .map((sec) => {
        const items = sec.items
          .map((it) => {
            if (it.children?.length) {
              const children = it.children.filter((c) => can(c.perm));
              if (children.length === 0 && !can(it.perm)) return null;
              return { ...it, children };
            }
            return can(it.perm) ? it : null;
          })
          .filter((x): x is Item => x !== null);
        return { ...sec, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [variant, isSubAdmin, rawSections, permissions]);

  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [isLg, setIsLg] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true' || stored === 'false') setSidebarOpen(stored === 'true');
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsLg(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const closeMobileNav = React.useCallback(() => setMobileNavOpen(false), []);

  const mobileNav = React.useMemo(
    () => ({
      open: mobileNavOpen,
      setOpen: setMobileNavOpen,
      toggle: () => setMobileNavOpen((v) => !v),
    }),
    [mobileNavOpen],
  );

  const showSidebar = isLg ? sidebarOpen : mobileNavOpen;

  const toggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isMenuOpen = React.useCallback(
    (key: string, childActive: boolean) => {
      if (Object.prototype.hasOwnProperty.call(openMenus, key)) return openMenus[key];
      return childActive;
    },
    [openMenus],
  );

  return (
    <SidebarMobileNavProvider value={mobileNav}>
      {mobileNavOpen && !isLg && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-line bg-paper-50',
          SIDEBAR_WIDTH_CLASS,
          'transition-[transform,box-shadow] duration-300 ease-out',
          showSidebar
            ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.12)]'
            : '-translate-x-full pointer-events-none shadow-none',
        )}
      >
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-line px-5 py-5">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2" onClick={closeMobileNav}>
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.siteName}
              className="h-8 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M5 19V5L19 19V5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="square"
                />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-400 ring-2 ring-paper-50" />
            </span>
          )}
          <div className="leading-tight">
            <div className="font-display text-sm font-extrabold text-ink">{brand?.siteName ?? 'Recovero'}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
              {variant === 'admin'
                ? isSubAdmin
                  ? 'Sub-admin · Control center'
                  : 'Admin · Control center'
                : 'Member area'}
            </div>
            <div className="mt-0.5 font-mono text-[9px] tabular-nums tracking-wide text-ink-soft">
              {formatAppVersion()}
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={closeMobileNav}
          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-6">
            <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              {sec.title}
            </div>
            {sec.items.map((it) => {
              if (it.children?.length) {
                const childActive = it.children.some(
                  (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
                );
                const menuKey = `${sec.title}-${it.label}`;
                const opened = isMenuOpen(menuKey, childActive);
                return (
                  <div key={it.label} className="mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenus((prev) => ({ ...prev, [menuKey]: !isMenuOpen(menuKey, childActive) }))
                      }
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        childActive ? 'text-ink' : 'text-ink/80',
                        'hover:bg-paper-200 hover:text-ink',
                      )}
                    >
                      <it.icon size={16} weight={childActive ? 'fill' : 'regular'} />
                      <span className="flex-1 text-left">{it.label}</span>
                      <CaretDown
                        size={14}
                        className={cn('transition-transform', opened ? 'rotate-180' : 'rotate-0')}
                      />
                    </button>
                    {opened && <div className="ml-8 mt-1 space-y-1">
                      {it.children.map((c) => {
                        const active = pathname === c.href || pathname.startsWith(c.href + '/');
                        return (
                          <Link
                            key={c.href}
                            href={c.href}
                            onClick={closeMobileNav}
                            className={cn(
                              'group relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                              active
                                ? 'bg-ink text-paper'
                                : 'text-ink/80 hover:bg-paper-200 hover:text-ink',
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId={`sidebar-${variant}`}
                                className="absolute inset-0 -z-10 rounded-lg bg-ink"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <c.icon size={13} weight={active ? 'fill' : 'regular'} />
                            <span>{c.label}</span>
                          </Link>
                        );
                      })}
                    </div>}
                  </div>
                );
              }

              if (!it.href) return null;

              const active =
                pathname === it.href ||
                (it.href !== '/admin/cms' && pathname.startsWith(it.href + '/'));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={closeMobileNav}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-ink text-paper'
                      : 'text-ink/80 hover:bg-paper-200 hover:text-ink',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`sidebar-${variant}`}
                      className="absolute inset-0 -z-10 rounded-lg bg-ink"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <it.icon size={16} weight={active ? 'fill' : 'regular'} />
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.href && navBadges?.[it.href] ? (
                    <NavBadge count={navBadges[it.href]} active={active} />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className="border-t border-line px-3 py-4">
        {variant === 'user' && (
          <div className="mb-3 hidden justify-end lg:flex">
            <NotificationBell />
          </div>
        )}
        <div className="rounded-lg bg-paper-100 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display font-bold text-paper">
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-bold text-ink">{user.name}</div>
              <div className="truncate font-mono text-[10px] text-ink-muted">{user.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-paper py-1.5 text-xs font-semibold text-ink hover:border-ink"
          >
            <SignOut size={12} weight="bold" /> Sign out
          </button>
        </div>
      </div>
    </aside>

      {/* Manual show / hide toggle (desktop) */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          'fixed top-1/2 z-50 hidden h-11 w-7 -translate-y-1/2 items-center justify-center',
          'rounded-r-lg border border-l-0 border-line bg-paper-50 text-ink-muted shadow-md',
          'transition-[left,background-color,color] duration-300 ease-out',
          'hover:bg-paper-200 hover:text-ink',
          'lg:flex',
          sidebarOpen ? 'left-64' : 'left-0',
        )}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {sidebarOpen ? (
          <CaretLeft size={18} weight="bold" aria-hidden />
        ) : (
          <CaretRight size={18} weight="bold" aria-hidden />
        )}
      </button>

      {/* Main area — shifts right when sidebar is open (desktop) */}
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col bg-paper',
          'transition-[margin-left] duration-300 ease-out',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-0',
        )}
      >
        {children}
      </div>
    </SidebarMobileNavProvider>
  );
}
