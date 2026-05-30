'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-line bg-paper text-ink shadow-card-hover font-medium',
          title: 'font-display font-bold text-sm',
          description: 'text-xs text-ink-muted font-serif italic',
          success: 'border-emerald-300',
          error: 'border-red-300',
        },
      }}
    />
  );
}
