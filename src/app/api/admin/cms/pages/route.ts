import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only.'),
  title: z.string().min(1),
  content: z.string().default(''),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const items = await prisma.customPage.findMany({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const exists = await prisma.customPage.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });

  const created = await prisma.customPage.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: created.id });
}
