import type { PermissionKey } from '@/lib/sub-admin';

/**
 * Maps admin route prefixes to the permission required to access them.
 * Used by the admin layout to gate SUB_ADMIN access centrally — no need
 * to edit every page individually.
 *
 * Order matters: longer/more-specific prefixes must come BEFORE shorter
 * ones so they match first.
 *
 * Routes NOT listed here are ADMIN-only by default (SUB_ADMIN blocked),
 * EXCEPT the always-allowed list below.
 */
const ROUTE_PERMISSIONS: Array<{ prefix: string; perm: PermissionKey }> = [
  // Orders
  { prefix: '/admin/orders', perm: 'viewImeiOrders' },

  // Catalog
  { prefix: '/admin/providers', perm: 'viewProviders' },
  { prefix: '/admin/services/groups', perm: 'manageServiceGroups' },
  { prefix: '/admin/services/imei', perm: 'viewImeiServices' },
  { prefix: '/admin/services/server', perm: 'viewServerServices' },
  { prefix: '/admin/price-groups', perm: 'managePriceGroups' },

  // People & logs
  { prefix: '/admin/users', perm: 'viewUsers' },
  { prefix: '/admin/sub-admins', perm: 'manageSubAdmins' },
  { prefix: '/admin/tickets', perm: 'viewTickets' },
  { prefix: '/admin/logs', perm: 'viewActivityLog' },
  { prefix: '/admin/api-keys', perm: 'manageApiKeys' },
  { prefix: '/admin/email', perm: 'manageEmailSettings' },
  { prefix: '/admin/telegram', perm: 'manageTelegram' },
  { prefix: '/admin/system', perm: 'manageSystem' },
  { prefix: '/admin/download-tools', perm: 'editCms' },
  { prefix: '/admin/maintenance', perm: 'editSettings' },
  { prefix: '/admin/settings', perm: 'viewSettings' },

  // Wallet / payments
  { prefix: '/admin/wallet', perm: 'viewWalletTopups' },
  { prefix: '/admin/payments', perm: 'managePaymentGateways' },

  // CMS (all sub-routes need editCms; overview needs viewCms)
  { prefix: '/admin/cms/landing-builder', perm: 'editCms' },
  { prefix: '/admin/cms/palette', perm: 'editCms' },
  { prefix: '/admin/cms/banners', perm: 'editCms' },
  { prefix: '/admin/cms/running-ads', perm: 'editCms' },
  { prefix: '/admin/cms/menus', perm: 'editCms' },
  { prefix: '/admin/cms/faq', perm: 'editCms' },
  { prefix: '/admin/cms/testimonials', perm: 'editCms' },
  { prefix: '/admin/cms/pages', perm: 'editCms' },
  { prefix: '/admin/cms/media', perm: 'editCms' },
  { prefix: '/admin/cms', perm: 'viewCms' },

  // Dashboard
  { prefix: '/admin/dashboard', perm: 'viewDashboard' },
];

/**
 * Paths always allowed for any SUB_ADMIN (no specific permission needed).
 */
const ALWAYS_ALLOWED = ['/admin/no-access', '/admin/appearance'];

/**
 * Resolve the required permission for a given admin pathname.
 * Returns:
 *   - { allowAll: true }       → no permission needed (always-allowed page)
 *   - { perm }                 → this permission is required
 *   - { adminOnly: true }      → not mapped; ADMIN only, SUB_ADMIN blocked
 */
export function resolveRoutePermission(pathname: string):
  | { allowAll: true }
  | { perm: PermissionKey }
  | { adminOnly: true } {
  if (ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return { allowAll: true };
  }
  for (const entry of ROUTE_PERMISSIONS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')) {
      return { perm: entry.perm };
    }
  }
  return { adminOnly: true };
}
