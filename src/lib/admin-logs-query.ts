import type { Prisma } from '@prisma/client';

export type LogAudienceTab = 'all' | 'admin' | 'user';

export const LOG_AUDIENCE_TABS: Array<{ key: LogAudienceTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admin & staff' },
  { key: 'user', label: 'Customers' },
];

export function resolveLogAudienceTab(audience?: string): (typeof LOG_AUDIENCE_TABS)[number] {
  return LOG_AUDIENCE_TABS.find((t) => t.key === audience) ?? LOG_AUDIENCE_TABS[0];
}

/** Filter activity log rows by who performed the action (admin/sub-admin vs retail user). */
export function activityLogAudienceWhere(audience: LogAudienceTab): Prisma.ActivityLogWhereInput {
  if (audience === 'admin') {
    return {
      OR: [{ userId: null }, { user: { role: { in: ['ADMIN', 'SUB_ADMIN'] } } }],
    };
  }
  if (audience === 'user') {
    return { user: { role: 'USER' } };
  }
  return {};
}
