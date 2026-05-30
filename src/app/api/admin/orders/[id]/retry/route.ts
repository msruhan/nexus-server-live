import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { OrderStatus } from '@/lib/constants';

// Simple retry: bump updatedAt so the poller picks it up next cycle.
// (Or for PENDING orders: re-submit. Kept short for now.)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'imei';

  if (type === 'server') {
    await prisma.serverOrder.update({
      where: { id },
      data: { updatedAt: new Date(0) }, // force poll
    });
  } else {
    await prisma.imeiOrder.update({ where: { id }, data: { updatedAt: new Date(0) } });
  }
  return NextResponse.json({ ok: true });
}
