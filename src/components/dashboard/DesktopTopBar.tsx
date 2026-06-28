'use client';

import { NotificationBell } from '@/components/dashboard/NotificationBell';

/** Desktop-only header row — mobile uses MobileBar for the bell. */
export function DesktopTopBar() {
  return (
    <div className="sticky top-0 z-30 hidden items-center justify-end border-b border-line bg-paper px-4 py-2.5 lg:flex lg:px-8 lg:py-3">
      <NotificationBell />
    </div>
  );
}
