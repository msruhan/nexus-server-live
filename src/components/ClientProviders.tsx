'use client';

import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { PwaShell } from '@/components/pwa/PwaShell';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <PwaShell />
    </ConfirmProvider>
  );
}
