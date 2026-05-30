// Local filesystem upload helper.
// Writes to public/uploads/<folder>/<timestamp>-<sanitized-name>.
// Swap this module for an S3/R2 implementation in production without
// touching consumers.

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export type UploadResult = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function saveUpload(
  file: File,
  folder = 'general',
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / 1024 / 1024} MB)`);
  }

  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'general';
  const dir = path.join(process.cwd(), 'public', 'uploads', safeFolder);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).toLowerCase().slice(0, 8);
  const base = path
    .basename(file.name, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  const filename = `${Date.now().toString(36)}-${base || 'file'}${ext}`;
  const fullPath = path.join(dir, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buf);

  return {
    url: `/uploads/${safeFolder}/${filename}`,
    filename,
    mimeType: file.type,
    size: file.size,
  };
}
