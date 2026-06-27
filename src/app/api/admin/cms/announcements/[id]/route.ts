import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().max(200).optional().nullable(),
  message: z.string().min(1).max(5000).optional(),
  tone: z.enum(['info', 'warning', 'maintenance']).optional(),
  linkUrl: z.string().max(500).optional().nullable(),
  linkLabel: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  showOnAdmin: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const data = parsed.data;
  const item = await prisma.siteAnnouncement.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.message !== undefined ? { message: data.message } : {}),
      ...(data.tone !== undefined ? { tone: data.tone } : {}),
      ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl } : {}),
      ...(data.linkLabel !== undefined ? { linkLabel: data.linkLabel } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt ? new Date(data.startAt) : null } : {}),
      ...(data.endAt !== undefined ? { endAt: data.endAt ? new Date(data.endAt) : null } : {}),
      ...(data.showOnAdmin !== undefined ? { showOnAdmin: data.showOnAdmin } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'announcement.updated',
    entity: 'SiteAnnouncement',
    entityId: item.id,
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.siteAnnouncement.delete({ where: { id } });

  await logActivity({
    userId: session?.user.id,
    action: 'announcement.deleted',
    entity: 'SiteAnnouncement',
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
