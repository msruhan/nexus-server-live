/**
 * Activity log adapter — IndoTeknizi-compatible helpers for Nexus ActivityLog model.
 */
import { prisma } from '@/lib/db';

export type ActivitySeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export type ActivityActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type ActivityTarget = {
  type: string;
  id?: string | null;
  label?: string | null;
};

type SystemEventInput = {
  action: string;
  severity?: ActivitySeverity;
  summary: string;
  detail?: string | null;
  actor?: ActivityActor | null;
  target?: ActivityTarget | null;
  metadata?: Record<string, unknown> | null;
};

export async function logSystemEvent(input: SystemEventInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.actor?.id ?? null,
        action: input.action,
        entity: input.target?.type ?? 'system',
        entityId: input.target?.id ?? null,
        metadata: JSON.stringify({
          severity: input.severity ?? 'INFO',
          summary: input.summary,
          detail: input.detail ?? null,
          targetLabel: input.target?.label ?? null,
          ...input.metadata,
        }),
      },
    });
  } catch (e) {
    console.error('[activity-log]', e);
  }
}

export async function logOrderEvent(input: {
  action: string;
  severity?: ActivitySeverity;
  summary: string;
  actor?: ActivityActor | null;
  target?: ActivityTarget | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const { ip, userAgent, ...rest } = input;
  await logSystemEvent({
    ...rest,
    detail: null,
    metadata: {
      ...(rest.metadata ?? {}),
      ...(ip ? { ip } : {}),
      ...(userAgent ? { userAgent } : {}),
    },
  });
}

export function extractRequestContext(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;
  const userAgent = req.headers.get('user-agent');
  return { ip, userAgent };
}
