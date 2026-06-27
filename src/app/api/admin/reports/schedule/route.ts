import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { computeNextReportRun } from '@/lib/reports/scheduled-email';

export const dynamic = 'force-dynamic';

const schema = z.object({
  reportEmailEnabled: z.boolean(),
  reportEmailTo: z.string().email().optional().nullable().or(z.literal('')),
  reportEmailFrequency: z.enum(['daily', 'weekly']),
  reportEmailHour: z.number().int().min(0).max(23),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const s = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      reportEmailEnabled: true,
      reportEmailTo: true,
      reportEmailFrequency: true,
      reportEmailHour: true,
      reportEmailLastSentAt: true,
      reportEmailNextRunAt: true,
    },
  });

  return NextResponse.json({ ok: true, settings: s });
}

export async function PUT(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const to =
    typeof parsed.data.reportEmailTo === 'string' && parsed.data.reportEmailTo.trim()
      ? parsed.data.reportEmailTo.trim()
      : null;

  const nextRun = parsed.data.reportEmailEnabled
    ? computeNextReportRun(parsed.data.reportEmailFrequency, parsed.data.reportEmailHour)
    : null;

  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      reportEmailEnabled: parsed.data.reportEmailEnabled,
      reportEmailTo: to,
      reportEmailFrequency: parsed.data.reportEmailFrequency,
      reportEmailHour: parsed.data.reportEmailHour,
      reportEmailNextRunAt: nextRun,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'report.schedule_updated',
    entity: 'SiteSettings',
  });

  return NextResponse.json({ ok: true });
}
