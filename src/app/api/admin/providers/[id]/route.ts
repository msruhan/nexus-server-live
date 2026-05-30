import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

const schema = z.object({
  title: z.string().min(2),
  host: z.string().url(),
  username: z.string().min(1),
  apiKey: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  notes: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const data: Record<string, unknown> = {
    title: parsed.data.title,
    host: parsed.data.host,
    username: parsed.data.username,
    status: parsed.data.status,
    notes: parsed.data.notes,
  };
  if (parsed.data.apiKey) data.apiKey = parsed.data.apiKey;

  await prisma.imeiApi.update({ where: { id }, data });
  await logActivity({
    userId: session?.user.id,
    action: 'provider.updated',
    entity: 'ImeiApi',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.imeiApi.delete({ where: { id } });
  await logActivity({
    userId: session?.user.id,
    action: 'provider.deleted',
    entity: 'ImeiApi',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
