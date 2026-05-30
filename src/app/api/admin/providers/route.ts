import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

const schema = z.object({
  title: z.string().min(2),
  host: z.string().url(),
  username: z.string().min(1),
  apiKey: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const list = await prisma.imeiApi.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ ok: true, items: list });
}

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const created = await prisma.imeiApi.create({ data: parsed.data });
  await logActivity({
    userId: session?.user.id,
    action: 'provider.created',
    entity: 'ImeiApi',
    entityId: created.id,
  });
  return NextResponse.json({ ok: true, id: created.id });
}
