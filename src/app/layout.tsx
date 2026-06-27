import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '@/components/ClientProviders';
import { Toaster } from '@/components/ui/Toaster';
import { getSitePaletteCss } from '@/lib/active-palette';
import { getBranding } from '@/lib/branding';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBranding();
  const title = brand.metaTitle?.trim() || `${brand.siteName} — ${brand.tagline}`;
  const description =
    brand.metaDescription?.trim() ||
    'A self-service unlock portal for iCloud removals, FRP bypass, and remote device services.';
  return {
    title,
    description,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: brand.siteName,
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
    },
    icons: brand.faviconUrl
      ? { icon: brand.faviconUrl, apple: brand.faviconUrl }
      : { icon: '/brand/icon-nexus.png', apple: '/brand/icon-nexus.png' },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2f63ff',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const paletteCss = await getSitePaletteCss();

  return (
    <html
      lang="id"
      className={`${inter.variable} ${display.variable} ${serif.variable} ${mono.variable}`}
    >
      <head>
        {/* Public site palette — account dashboards override via AccountThemeShell */}
        <style id="palette-vars" dangerouslySetInnerHTML={{ __html: `:root{${paletteCss}}` }} />
      </head>
      <body className="bg-paper text-ink font-sans">
        <ClientProviders>{children}</ClientProviders>
        <Toaster />
      </body>
    </html>
  );
}
