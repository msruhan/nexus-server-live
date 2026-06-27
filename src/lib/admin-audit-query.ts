import type { Prisma } from '@prisma/client';

/** Staff audit actions surfaced in the dedicated audit view. */
export const AUDIT_ACTIONS = [
  { key: 'wallet.topup_approved', label: 'Top-up approved' },
  { key: 'wallet.topup_rejected', label: 'Top-up rejected' },
  { key: 'wallet.admin_credit', label: 'Manual wallet credit' },
  { key: 'service.updated', label: 'Service updated' },
  { key: 'service.deleted', label: 'Service deleted' },
  { key: 'price_group.updated', label: 'Price group updated' },
  { key: 'site.settings_updated', label: 'Site settings updated' },
] as const;

export type AuditActionKey = (typeof AUDIT_ACTIONS)[number]['key'];

export function buildAuditWhere(input: {
  action?: string | null;
  entityId?: string | null;
  targetUserId?: string | null;
  actorUserId?: string | null;
}): Prisma.ActivityLogWhereInput {
  const where: Prisma.ActivityLogWhereInput = {
    action: { in: AUDIT_ACTIONS.map((a) => a.key) },
    OR: [{ userId: null }, { user: { role: { in: ['ADMIN', 'SUB_ADMIN'] } } }],
  };

  if (input.action && AUDIT_ACTIONS.some((a) => a.key === input.action)) {
    where.action = input.action;
  }

  if (input.entityId?.trim()) {
    where.entityId = input.entityId.trim();
  }

  if (input.actorUserId?.trim()) {
    where.userId = input.actorUserId.trim();
  }

  if (input.targetUserId?.trim()) {
    const uid = input.targetUserId.trim();
    where.AND = [
      {
        OR: [
          { entity: 'User', entityId: uid },
          { metadata: { contains: `"userId":"${uid}"` } },
          { metadata: { contains: `"targetEmail"` } },
        ],
      },
    ];
  }

  return where;
}

export function parseAuditMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

export function formatAuditSummary(action: string, metadata: Record<string, unknown>): string {
  switch (action) {
    case 'wallet.topup_approved':
      return `Approved top-up · amount ${metadata.amount ?? '—'} · user ${metadata.userId ?? '—'}`;
    case 'wallet.topup_rejected':
      return `Rejected top-up · user ${metadata.userId ?? '—'}`;
    case 'wallet.admin_credit':
      return `Manual credit ${metadata.amount ?? '—'} → ${metadata.targetEmail ?? metadata.userId ?? '—'}`;
    case 'service.updated': {
      const price =
        metadata.price !== undefined
          ? `price → ${metadata.price}`
          : metadata.oldPrice !== undefined
            ? `price ${metadata.oldPrice} → ${metadata.newPrice}`
            : null;
      const title = metadata.title ? `title "${metadata.title}"` : null;
      return [title, price, metadata.status ? `status ${metadata.status}` : null].filter(Boolean).join(' · ') || 'Service fields updated';
    }
    case 'service.deleted':
      return 'Service removed from catalog';
    case 'price_group.updated':
      return `Price group "${metadata.name ?? metadata.groupId ?? '—'}" updated`;
    default:
      return Object.keys(metadata).length ? JSON.stringify(metadata) : '—';
  }
}
