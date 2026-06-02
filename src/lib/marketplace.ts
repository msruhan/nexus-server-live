/** Uploaded media is served via /api/uploads; older records may be raw /uploads. */
export function resolveMarketplaceImage(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `/api${url}` : url;
}

/** Up-to-two-letter initials for the image fallback tile. */
export function marketplaceInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '··';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export type MarketplaceKind = 'imei' | 'server';

export type MarketplaceCardItem = {
  kind: MarketplaceKind;
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  serviceCount: number;
  priceFromLabel: string | null;
  featured: boolean;
};
