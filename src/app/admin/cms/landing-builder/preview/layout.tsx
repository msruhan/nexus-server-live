// Preview layout — strips the admin sidebar so the iframe shows the
// real public surface (Ticker · Navbar · sections · Footer).

import { Ticker } from '@/components/landing/Ticker';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative bg-paper">
      <Ticker />
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
