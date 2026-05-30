import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

const schema = z.object({ isActive: z.boolean().optional(), role: z.enum(['USER', 'ADMIN']).optional() });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  await prisma.user.update({ where: { id }, data: parsed.data });
  await logActivity({
    userId: session?.user.id,
    action: 'user.updated',
    entity: 'User',
    entityId: id,
    metadata: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
