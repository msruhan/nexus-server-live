import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { creditWallet } from '@/lib/wallet';
import { LedgerType } from '@/lib/constants';
import { logActivity } from '@/lib/activity';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const tr = await prisma.topupRequest.findUnique({ where: { id } });
  if (!tr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tr.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await creditWallet(
      tx,
      tr.userId,
      tr.amount,
      LedgerType.TOPUP,
      `Top-up approved · request ${tr.id}`,
      tr.id,
    );
    await tx.topupRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: session?.user.id,
      },
    });
  });

  await logActivity({
    userId: session?.user.id,
    action: 'wallet.topup_approved',
    entity: 'TopupRequest',
    entityId: id,
    metadata: { amount: tr.amount, userId: tr.userId },
  });

  // Email notification — fire-and-forget; never blocks the admin action.
  // We re-read the wallet balance here because creditWallet ran in a tx
  // that's now committed.
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: tr.userId },
      select: { balance: true },
    });
    void import('@/lib/email/notify').then(({ notifyTopupApproved }) =>
      notifyTopupApproved({
        userId: tr.userId,
        amount: tr.amount.toString(),
        newBalance: wallet?.balance.toString() ?? '0',
      }),
    );
  } catch {
    /* swallow — never affect the admin response */
  }

  return NextResponse.json({ ok: true });
}
