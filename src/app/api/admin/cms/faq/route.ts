import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  category: z.string().default('general'),
  question: z.string().min(1),
  answer: z.string().min(1),
  isVisible: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await prisma.faqItem.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const last = await prisma.faqItem.findFirst({
    where: { category: parsed.data.category },
    orderBy: { sortOrder: 'desc' },
  });
  const created = await prisma.faqItem.create({
    data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
