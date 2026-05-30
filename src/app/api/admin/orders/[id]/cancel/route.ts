import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { LedgerType, OrderStatus } from '@/lib/constants';
import { logActivity } from '@/lib/activity';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'imei';

  try {
    if (type === 'server') {
      const order = await prisma.serverOrder.findUniqueOrThrow({ where: { id } });
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
        return NextResponse.json({ ok: true });
      }
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
          const newBalance = wallet.balance.add(order.price);
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
          await tx.walletLedger.create({
            data: {
              walletId: wallet.id,
              type: LedgerType.REFUND,
              amount: order.price,
              balance: newBalance,
              description: `Refund · ${order.orderCode} · Cancelled by admin`,
              referenceId: order.id,
            },
          });
        }
        await tx.serverOrder.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED, completedAt: new Date() },
        });
      });
    } else {
      const order = await prisma.imeiOrder.findUniqueOrThrow({ where: { id } });
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
        return NextResponse.json({ ok: true });
      }
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
          const newBalance = wallet.balance.add(order.price);
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
          await tx.walletLedger.create({
            data: {
              walletId: wallet.id,
              type: LedgerType.REFUND,
              amount: order.price,
              balance: newBalance,
              description: `Refund · ${order.orderCode} · Cancelled by admin`,
              referenceId: order.id,
            },
          });
        }
        await tx.imeiOrder.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED, completedAt: new Date() },
        });
      });
    }

    await logActivity({
      userId: session?.user.id,
      action: 'order.admin_cancelled',
      entity: type === 'server' ? 'ServerOrder' : 'ImeiOrder',
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cancel failed' },
      { status: 500 },
    );
  }
}
