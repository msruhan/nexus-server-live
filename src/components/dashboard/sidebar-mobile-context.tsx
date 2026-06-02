'use client';

import * as React from 'react';

type SidebarMobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarMobileNavContext = React.createContext<SidebarMobileNavContextValue | null>(null);

export function SidebarMobileNavProvider({
  value,
  children,
}: {
  value: SidebarMobileNavContextValue;
  children: React.ReactNode;
}) {
  return (
    <SidebarMobileNavContext.Provider value={value}>{children}</SidebarMobileNavContext.Provider>
  );
}

export function useSidebarMobileNav() {
  const ctx = React.useContext(SidebarMobileNavContext);
  if (!ctx) {
    throw new Error('useSidebarMobileNav must be used within Sidebar');
  }
  return ctx;
}
