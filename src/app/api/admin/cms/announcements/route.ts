import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().max(200).optional().nullable(),
  message: z.string().min(1).max(5000),
  tone: z.enum(['info', 'warning', 'maintenance']).optional(),
  linkUrl: z.string().max(500).optional().nullable(),
  linkLabel: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  showOnAdmin: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const items = await prisma.siteAnnouncement.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const data = parsed.data;
  const item = await prisma.siteAnnouncement.create({
    data: {
      title: data.title ?? null,
      message: data.message,
      tone: data.tone ?? 'info',
      linkUrl: data.linkUrl ?? null,
      linkLabel: data.linkLabel ?? null,
      isActive: data.isActive ?? true,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      showOnAdmin: data.showOnAdmin ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'announcement.created',
    entity: 'SiteAnnouncement',
    entityId: item.id,
  });

  return NextResponse.json({ ok: true, item });
}
