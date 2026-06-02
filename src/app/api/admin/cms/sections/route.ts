import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { defaultContent, SECTION_TYPES } from '@/lib/cms-types';

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const pageSlug = url.searchParams.get('page') ?? 'home';
  const items = await prisma.pageSection.findMany({
    where: { pageSlug },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ok: true, items });
}

const createSchema = z.object({
  pageSlug: z.string().default('home'),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // Enforce a per-type instance limit per page (R7.5).
  const PER_TYPE_LIMIT = 20;
  const typeCount = await prisma.pageSection.count({
    where: { pageSlug: parsed.data.pageSlug, sectionType: parsed.data.sectionType },
  });
  if (typeCount >= PER_TYPE_LIMIT) {
    return NextResponse.json(
      { error: `Limit reached: a page may have at most ${PER_TYPE_LIMIT} "${parsed.data.sectionType}" sections.` },
      { status: 400 },
    );
  }

  const last = await prisma.pageSection.findFirst({
    where: { pageSlug: parsed.data.pageSlug },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const created = await prisma.pageSection.create({
    data: {
      pageSlug: parsed.data.pageSlug,
      sectionType: parsed.data.sectionType,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      content: JSON.stringify(defaultContent(parsed.data.sectionType)),
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'cms.section_created',
    entity: 'PageSection',
    entityId: created.id,
    metadata: { type: parsed.data.sectionType },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
