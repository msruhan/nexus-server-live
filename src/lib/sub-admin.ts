/**
 * Sub-Admin permission system.
 *
 * Design:
 *   - ADMIN role: full access, bypasses all permission checks.
 *   - SUB_ADMIN role: must have explicit permission for each feature.
 *   - USER role: no admin access at all.
 *
 * Usage in admin routes/pages:
 *   const allowed = await hasPermission(session.user.id, 'viewImeiOrders');
 *   if (!allowed) redirect('/admin/dashboard');
 *
 * The admin layout already gates on role (ADMIN or SUB_ADMIN). Individual
 * pages then check specific permissions for SUB_ADMIN users.
 */
import { prisma } from '@/lib/db';
import type { SubAdminPermission } from '@prisma/client';

export type PermissionKey = keyof Omit<SubAdminPermission, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

/**
 * All available permissions grouped by category for the UI.
 */
export const PERMISSION_GROUPS: Array<{
  category: string;
  permissions: Array<{ key: PermissionKey; label: string }>;
}> = [
  {
    category: 'Dashboard',
    permissions: [
      { key: 'viewDashboard', label: 'View dashboard' },
    ],
  },
  {
    category: 'Orders',
    permissions: [
      { key: 'viewImeiOrders', label: 'View IMEI orders' },
      { key: 'viewServerOrders', label: 'View server orders' },
      { key: 'cancelRefundOrders', label: 'Cancel / refund orders' },
    ],
  },
  {
    category: 'Services',
    permissions: [
      { key: 'viewImeiServices', label: 'View IMEI services' },
      { key: 'editImeiServices', label: 'Edit IMEI services (price, status)' },
      { key: 'viewServerServices', label: 'View server services' },
      { key: 'editServerServices', label: 'Edit server services' },
      { key: 'manageServiceGroups', label: 'Manage service groups / boxes' },
    ],
  },
  {
    category: 'API Providers',
    permissions: [
      { key: 'viewProviders', label: 'View API providers' },
      { key: 'editProviders', label: 'Add / edit / delete providers' },
      { key: 'syncServices', label: 'Sync & import services from supplier' },
    ],
  },
  {
    category: 'Users & Wallet',
    permissions: [
      { key: 'viewUsers', label: 'View user list' },
      { key: 'editUsers', label: 'Activate / deactivate users' },
      { key: 'viewWalletTopups', label: 'View top-up requests' },
      { key: 'approveTopups', label: 'Approve / reject top-ups' },
      { key: 'managePriceGroups', label: 'Manage price groups' },
    ],
  },
  {
    category: 'Support Tickets',
    permissions: [
      { key: 'viewTickets', label: 'View support tickets' },
      { key: 'replyTickets', label: 'Reply to tickets' },
      { key: 'closeTickets', label: 'Close / reopen tickets' },
    ],
  },
  {
    category: 'CMS',
    permissions: [
      { key: 'viewCms', label: 'View CMS pages' },
      { key: 'editCms', label: 'Edit landing builder, banners, menus, FAQ, etc.' },
    ],
  },
  {
    category: 'Settings & System',
    permissions: [
      { key: 'viewSettings', label: 'View site settings' },
      { key: 'editSettings', label: 'Edit site settings' },
      { key: 'viewActivityLog', label: 'View activity log' },
      { key: 'manageApiKeys', label: 'Manage API keys' },
      { key: 'managePaymentGateways', label: 'Manage payment gateways' },
      { key: 'manageEmailSettings', label: 'Manage email / SMTP settings' },
      { key: 'manageTelegram', label: 'Manage Telegram bot settings' },
      { key: 'manageSystem', label: 'Manage system & updates' },
      { key: 'manageSubAdmins', label: 'Manage sub-admins' },
    ],
  },
];

/**
 * Check if a user has a specific permission. Returns true for ADMIN role
 * (full access). For SUB_ADMIN, checks the permission record.
 */
export async function hasPermission(
  userId: string,
  role: string,
  permission: PermissionKey,
): Promise<boolean> {
  if (role === 'ADMIN') return true;
  if (role !== 'SUB_ADMIN') return false;

  const perms = await prisma.subAdminPermission.findUnique({
    where: { userId },
  });
  if (!perms) return false;
  return perms[permission] === true;
}

/**
 * Get all permissions for a sub-admin user. Returns null if no record exists.
 */
export async function getPermissions(userId: string): Promise<Omit<SubAdminPermission, 'id' | 'createdAt' | 'updatedAt'> | null> {
  const perms = await prisma.subAdminPermission.findUnique({
    where: { userId },
  });
  if (!perms) return null;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = perms;
  return rest;
}

/**
 * Get all permission keys as a flat array.
 */
export function allPermissionKeys(): PermissionKey[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
}
