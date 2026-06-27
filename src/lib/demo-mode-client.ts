'use client';

/** Client-side demo flag (set NEXT_PUBLIC_NEXUS_DEMO_MODE=true on Vercel demo). */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_NEXUS_DEMO_MODE === 'true';

export function useDemoMode(): boolean {
  return IS_DEMO_MODE;
}
