/** Uploaded media is served via /api/uploads; older records may be raw /uploads. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `/api${url}` : url;
}
