'use client';

import { ConfirmProvider } from '@/components/ui/ConfirmProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
