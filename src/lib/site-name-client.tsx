'use client';

import * as React from 'react';
import { DEFAULT_SITE_NAME, resolveSiteName } from '@/lib/site-name';

const SiteNameContext = React.createContext(DEFAULT_SITE_NAME);

export function SiteNameProvider({
  siteName,
  children,
}: {
  siteName: string;
  children: React.ReactNode;
}) {
  return (
    <SiteNameContext.Provider value={resolveSiteName(siteName)}>{children}</SiteNameContext.Provider>
  );
}

export function useSiteName(): string {
  return React.useContext(SiteNameContext);
}
