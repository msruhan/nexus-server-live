import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { creditWallet, ensureWallet } from '@/lib/wallet';
import { LedgerType } from '@/lib/constants';
import { logActivity } from '@/lib/activity';
import { assertNotDemoMode } from '@/lib/demo-mode';

const schema = z.object({
  amount: z.number().positive('Amount must be greater than zero').max(1_000_000),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const demoBlocked = assertNotDemoMode();
  if (demoBlocked) return demoBlocked;

  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await ensureWallet(user.id);

  const note = parsed.data.note?.trim();
  const description = note
    ? `Manual credit by admin · ${note}`
    : 'Manual credit by admin';

  const result = await prisma.$transaction(async (tx) => {
    const balance = await creditWallet(
      tx,
      user.id,
      parsed.data.amount,
      LedgerType.TOPUP,
      description,
      `admin-credit:${session?.user.id ?? 'system'}`,
    );
    return balance;
  });

  await logActivity({
    userId: session?.user.id,
    action: 'wallet.admin_credit',
    entity: 'User',
    entityId: user.id,
    metadata: {
      amount: parsed.data.amount,
      note: note ?? null,
      targetEmail: user.email,
    },
  });

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: { balance: true },
    });
    void import('@/lib/email/notify').then(({ notifyTopupApproved }) =>
      notifyTopupApproved({
        userId: user.id,
        amount: String(parsed.data.amount),
        newBalance: wallet?.balance.toString() ?? result.toString(),
      }),
    );
  } catch {
    /* optional email */
  }

  return NextResponse.json({
    ok: true,
    balance: Number(result),
  });
}
