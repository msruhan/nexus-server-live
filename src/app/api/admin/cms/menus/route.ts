import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  location: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().nullable().optional(),
  isExternal: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const location = url.searchParams.get('location');
  const items = await prisma.navigationMenu.findMany({
    where: location ? { location } : undefined,
    orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const last = await prisma.navigationMenu.findFirst({
    where: { location: parsed.data.location },
    orderBy: { sortOrder: 'desc' },
  });
  const created = await prisma.navigationMenu.create({
    data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
