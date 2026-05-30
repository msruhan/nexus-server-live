import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().nullable().optional(),
  position: z.string().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if ('startDate' in parsed.data) {
    data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  }
  if ('endDate' in parsed.data) {
    data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  }

  await prisma.banner.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
