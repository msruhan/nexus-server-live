import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import { getSitePaletteCss } from '@/lib/active-palette';

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

export const metadata: Metadata = {
  title: 'Nexus Server — Bureau of IMEI & Server Operations',
  description:
    'A self-service desk for IMEI unlocks, iCloud removals, FRP bypass, and server flashing. Powered by DhruFusion. Engineered for resellers who count seconds.',
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
