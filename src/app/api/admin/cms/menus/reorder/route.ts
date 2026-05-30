import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

const schema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  await prisma.$transaction(
    parsed.data.ids.map((id, idx) =>
      prisma.navigationMenu.update({ where: { id }, data: { sortOrder: (idx + 1) * 10 } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
