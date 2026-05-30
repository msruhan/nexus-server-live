import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  text: z.string().min(1),
  linkUrl: z.string().optional(),
  bgColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await prisma.runningAd.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const last = await prisma.runningAd.findFirst({ orderBy: { sortOrder: 'desc' } });
  const created = await prisma.runningAd.create({
    data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
