import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageSlug = url.searchParams.get('page') ?? 'home';
  const items = await prisma.pageSection.findMany({
    where: { pageSlug, isVisible: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      sectionType: true,
      title: true,
      subtitle: true,
      content: true,
      settings: true,
    },
  });
  return NextResponse.json({ ok: true, items });
}
