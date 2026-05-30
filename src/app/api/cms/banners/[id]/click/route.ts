import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.banner.update({
    where: { id },
    data: { clickCount: { increment: 1 } },
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
