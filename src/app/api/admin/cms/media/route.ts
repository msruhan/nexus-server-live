import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const folder = url.searchParams.get('folder');
  const items = await prisma.mediaFile.findMany({
    where: folder ? { folder } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ ok: true, items });
}
