import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const position = url.searchParams.get('position') ?? 'home_top';
  const now = new Date();
  const items = await prisma.banner.findMany({
    where: {
      position,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ok: true, items });
}
