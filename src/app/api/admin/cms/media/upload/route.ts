import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { saveUpload } from '@/lib/upload';
import { logActivity } from '@/lib/activity';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const fd = await req.formData();
    const file = fd.get('file');
    const folder = String(fd.get('folder') ?? 'general');
    const altText = (fd.get('altText') as string) ?? null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await saveUpload(file, folder);
    const media = await prisma.mediaFile.create({
      data: {
        filename: result.filename,
        url: result.url,
        mimeType: result.mimeType,
        size: result.size,
        altText,
        uploadedBy: session?.user.id,
        folder,
      },
    });

    await logActivity({
      userId: session?.user.id,
      action: 'media.uploaded',
      entity: 'MediaFile',
      entityId: media.id,
      metadata: { size: result.size, folder },
    });

    return NextResponse.json({
      ok: true,
      id: media.id,
      url: result.url,
      filename: result.filename,
      mimeType: result.mimeType,
      size: result.size,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
