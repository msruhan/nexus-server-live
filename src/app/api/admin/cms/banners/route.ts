import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

const schema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  imageUrl: z.string().min(1),
  linkUrl: z.string().optional(),
  position: z.string().default('home_top'),
  isActive: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await prisma.banner.findMany({
    orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const last = await prisma.banner.findFirst({
    where: { position: parsed.data.position },
    orderBy: { sortOrder: 'desc' },
  });

  const created = await prisma.banner.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'cms.banner_created',
    entity: 'Banner',
    entityId: created.id,
  });

  return NextResponse.json({ ok: true, id: created.id });
}
