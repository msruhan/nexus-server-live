import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashVerificationToken } from '@/lib/auth/email-verification';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
  }

  const hash = hashVerificationToken(token);
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: hash },
    select: {
      id: true,
      email: true,
      emailVerificationExpiresAt: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Verification link has expired. Please register again or contact support.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      isActive: true,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'auth.email_verified',
    entity: 'User',
    entityId: user.id,
  });

  return NextResponse.json({ ok: true, email: user.email });
}
