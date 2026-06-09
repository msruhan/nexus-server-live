import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { notifyTelegramAdminNewTopup } from '@/lib/telegram/notify';

const schema = z.object({
  amount: z.number().min(1).max(50000), // USD
  note: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Amount must be at least $1.00' }, { status: 400 });
  }

  const tr = await prisma.topupRequest.create({
    data: {
      userId: session.user.id,
      amount: parsed.data.amount,
      note: parsed.data.note,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: 'wallet.topup_requested',
    entity: 'TopupRequest',
    entityId: tr.id,
    metadata: { amount: parsed.data.amount },
  });

  // Fire-and-forget Telegram admin notification
  void notifyTelegramAdminNewTopup({
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    amount: parsed.data.amount,
  });
  void import('@/lib/email/notify').then(({ notifyAdminNewTopup }) =>
    notifyAdminNewTopup({
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      amount: parsed.data.amount,
    }),
  );

  return NextResponse.json({ ok: true, id: tr.id });
}
