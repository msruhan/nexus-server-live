import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { getLicenseEnforcementState, isLicenseRuntimeLocked } from '@/lib/license-state';
import { parseRegistrationActivationMode } from '@/lib/auth/registration-activation';
import { createEmailVerificationToken } from '@/lib/auth/email-verification';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const licenseState = await getLicenseEnforcementState();
  if (isLicenseRuntimeLocked(licenseState)) {
    return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 403 });
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (settings && !settings.enableRegistration) {
    return NextResponse.json({ error: 'Registration is disabled' }, { status: 403 });
  }

  const activationMode = parseRegistrationActivationMode(settings?.registrationActivationMode);
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  let verificationToken: string | null = null;

  if (activationMode === 'MANUAL') {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        password: hashed,
        role: 'USER',
        isActive: false,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    await logActivity({
      userId: user.id,
      action: 'user.registered',
      entity: 'User',
      entityId: user.id,
      metadata: { activationMode },
    });
    return NextResponse.json({ ok: true, id: user.id, activation: 'manual' });
  }

  if (activationMode === 'EMAIL') {
    const tokenBundle = createEmailVerificationToken();
    verificationToken = tokenBundle.token;
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        password: hashed,
        role: 'USER',
        isActive: true,
        emailVerificationToken: tokenBundle.hash,
        emailVerificationExpiresAt: tokenBundle.expiresAt,
      },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
    await logActivity({
      userId: user.id,
      action: 'user.registered',
      entity: 'User',
      entityId: user.id,
      metadata: { activationMode },
    });
    void import('@/lib/email/notify').then(({ notifyEmailVerification }) =>
      notifyEmailVerification({
        userId: user.id,
        email: user.email,
        name: user.name,
        token: verificationToken!,
      }),
    );
    return NextResponse.json({ ok: true, id: user.id, activation: 'email' });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      password: hashed,
      role: 'USER',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });
  await logActivity({
    userId: user.id,
    action: 'user.registered',
    entity: 'User',
    entityId: user.id,
    metadata: { activationMode: 'AUTO' },
  });
  void import('@/lib/email/notify').then(({ notifyRegistered }) =>
    notifyRegistered({ userId: user.id, email: user.email, name: user.name ?? '' }),
  );
  return NextResponse.json({ ok: true, id: user.id, activation: 'auto' });
}
