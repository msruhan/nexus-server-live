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

  return NextResponse.json({ ok: true });
}
