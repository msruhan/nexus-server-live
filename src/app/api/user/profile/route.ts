import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const schema = z.object({ name: z.string().min(2).max(80) });

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ ok: true });
}
