// Preview layout — strips the admin sidebar so the iframe shows the
// real public surface (Navbar · sections · Footer).

import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative bg-paper">
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
