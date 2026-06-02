import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ folder: string; filename: string }> },
) {
  const { folder, filename } = await params;

  if (!/^[a-z0-9_-]{1,32}$/i.test(folder) || !/^[a-z0-9._-]{1,120}$/i.test(filename)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(uploadsRoot, folder, filename);
  const resolved = path.resolve(filePath);
  const rootResolved = path.resolve(uploadsRoot);

  if (!resolved.startsWith(`${rootResolved}${path.sep}`) && resolved !== rootResolved) {
    return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
  }

  try {
    const data = await readFile(resolved);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] ?? 'application/octet-stream';

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
