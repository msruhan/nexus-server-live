import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { getLicenseEnforcementState, isLicenseRuntimeLocked } from '@/lib/license-state';

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

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      password: hashed,
      role: 'USER',
    },
  });
  await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

  await logActivity({ userId: user.id, action: 'user.registered', entity: 'User', entityId: user.id });

  void import('@/lib/email/notify').then(({ notifyRegistered }) =>
    notifyRegistered({ userId: user.id, email: user.email, name: user.name ?? '' }),
  );

  return NextResponse.json({ ok: true, id: user.id });
}
