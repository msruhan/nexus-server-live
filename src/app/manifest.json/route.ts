import { NextResponse } from 'next/server';
import { getBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

export async function GET() {
  const brand = await getBranding();
  return NextResponse.json({
    name: brand.siteName,
    short_name: brand.siteName.slice(0, 12),
    description: brand.tagline || 'IMEI & Server unlock services',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: brand.primaryColor || '#2f63ff',
    orientation: 'portrait-primary',
    icons: [
      {
        src: brand.logoIconUrl || brand.faviconUrl || '/brand/icon-nexus.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: brand.logoUrl || '/brand/logo-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  });
}
