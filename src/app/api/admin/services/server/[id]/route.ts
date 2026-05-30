import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { postNewService, postPriceUpdate } from '@/lib/telegram/channel';

const schema = z
  .object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().int().min(0).optional(),
    deliveryTime: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // Fetch before state for channel auto-post detection
  const before = await prisma.serverService.findUnique({
    where: { id },
    select: { title: true, price: true, status: true, box: { select: { title: true } } },
  });

  await prisma.serverService.update({ where: { id }, data: parsed.data });
  await logActivity({
    userId: session?.user.id,
    action: 'service.updated',
    entity: 'ServerService',
    entityId: id,
    metadata: parsed.data,
  });

  // Fire-and-forget channel auto-posts
  if (before) {
    const newStatus = parsed.data.status ?? before.status;
    const newPrice = parsed.data.price ?? Number(before.price);
    const title = parsed.data.title ?? before.title;

    if (parsed.data.status === 'ACTIVE' && before.status !== 'ACTIVE') {
      void postNewService({ title, category: before.box?.title ?? 'Server', price: newPrice });
    }
    if (parsed.data.price !== undefined && Number(before.price) !== parsed.data.price && newStatus === 'ACTIVE') {
      void postPriceUpdate({ title, oldPrice: Number(before.price), newPrice: parsed.data.price });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.serverService.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
