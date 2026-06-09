import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.topupRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request already reviewed' }, { status: 400 });
  }

  await prisma.topupRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedBy: session?.user.id,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'wallet.topup_rejected',
    entity: 'TopupRequest',
    entityId: id,
  });

  void import('@/lib/email/notify').then(({ notifyTopupRejected }) =>
    notifyTopupRejected({ topupRequestId: id }),
  );

  return NextResponse.json({ ok: true });
}
