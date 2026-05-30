import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
  content: z.string().min(1),
  isVisible: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const last = await prisma.testimonial.findFirst({ orderBy: { sortOrder: 'desc' } });
  const created = await prisma.testimonial.create({
    data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
