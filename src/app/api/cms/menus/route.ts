import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const location = url.searchParams.get('location') ?? 'header';
  const items = await prisma.navigationMenu.findMany({
    where: { location, isVisible: true, parentId: null },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ok: true, items });
}
