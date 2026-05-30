import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const media = await prisma.mediaFile.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete from filesystem if it's a local /uploads path
  if (media.url.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'public', media.url);
    try {
      await unlink(fullPath);
    } catch {
      // Ignore if already gone
    }
  }

  await prisma.mediaFile.delete({ where: { id } });
  await logActivity({
    userId: session?.user.id,
    action: 'media.deleted',
    entity: 'MediaFile',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
