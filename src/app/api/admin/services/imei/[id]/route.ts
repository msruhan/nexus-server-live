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

  // Fetch current state before update (for price change detection)
  const before = await prisma.imeiService.findUnique({
    where: { id },
    select: { title: true, price: true, status: true, group: { select: { title: true } } },
  });

  await prisma.imeiService.update({ where: { id }, data: parsed.data });
  const auditMeta: Record<string, unknown> = { ...parsed.data };
  if (before && parsed.data.price !== undefined && Number(before.price) !== parsed.data.price) {
    auditMeta.oldPrice = Number(before.price);
    auditMeta.newPrice = parsed.data.price;
    auditMeta.title = parsed.data.title ?? before.title;
  }
  await logActivity({
    userId: session?.user.id,
    action: 'service.updated',
    entity: 'ImeiService',
    entityId: id,
    metadata: auditMeta,
  });

  // Fire-and-forget channel auto-posts
  if (before) {
    const newStatus = parsed.data.status ?? before.status;
    const newPrice = parsed.data.price ?? Number(before.price);
    const title = parsed.data.title ?? before.title;

    // Post to channel if status changed to ACTIVE (new publish)
    if (parsed.data.status === 'ACTIVE' && before.status !== 'ACTIVE') {
      void postNewService({
        title,
        category: before.group?.title ?? 'IMEI',
        price: newPrice,
        deliveryTime: parsed.data.deliveryTime,
      });
    }
    // Post to channel if price changed on an active service
    if (parsed.data.price !== undefined && Number(before.price) !== parsed.data.price && newStatus === 'ACTIVE') {
      void postPriceUpdate({
        title,
        oldPrice: Number(before.price),
        newPrice: parsed.data.price,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.imeiService.delete({ where: { id } });
  await logActivity({
    userId: session?.user.id,
    action: 'service.deleted',
    entity: 'ImeiService',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
