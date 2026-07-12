import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { assertNotDemoMode } from '@/lib/demo-mode';
import { createEmailVerificationToken } from '@/lib/auth/email-verification';
import { userNeedsEmailVerification } from '@/lib/auth/registration-activation';
import { notifyEmailVerification } from '@/lib/email/notify';

const RESEND_COOLDOWN_MS = 60_000;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const demoBlocked = assertNotDemoMode();
  if (demoBlocked) return demoBlocked;

  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      emailVerificationToken: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!userNeedsEmailVerification(user)) {
    return NextResponse.json({ error: 'This user does not need email verification' }, { status: 400 });
  }

  const recent = await prisma.emailLog.findFirst({
    where: {
      refType: 'User',
      refId: user.id,
      event: 'auth.email_verification',
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (recent) {
    return NextResponse.json(
      { error: 'Verification email was sent recently. Wait a minute before resending.' },
      { status: 429 },
    );
  }

  const tokenBundle = createEmailVerificationToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: tokenBundle.hash,
      emailVerificationExpiresAt: tokenBundle.expiresAt,
    },
  });

  const result = await notifyEmailVerification({
    userId: user.id,
    email: user.email,
    name: user.name,
    token: tokenBundle.token,
  });

  await logActivity({
    userId: session?.user.id,
    action: 'user.verification_resent',
    entity: 'User',
    entityId: user.id,
    metadata: {
      targetEmail: user.email,
      emailOk: result.ok,
      logId: result.logId,
      reason: result.reason ?? null,
    },
  });

  if (!result.ok) {
    const message =
      result.reason === 'smtp_disabled'
        ? 'SMTP is disabled. Enable it under Admin → Email and save settings.'
        : result.reason === 'event_excluded'
          ? 'Email verification event is disabled. Enable "Email verification link" under Admin → Email → Events.'
          : (result.reason ?? 'Failed to send verification email');

    return NextResponse.json({ error: message, logId: result.logId }, { status: 502 });
  }

  return NextResponse.json({ ok: true, logId: result.logId });
}
