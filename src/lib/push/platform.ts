/** Client-side PWA / push platform helpers (browser only). */

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

import { resolveSiteName } from '@/lib/site-name';

/** iOS Web Push only works in a Home Screen PWA (Safari 16.4+). */
export function iosPushRequiresInstall(): boolean {
  return isIosDevice() && !isStandalonePwa();
}

export function canSubscribeToPush(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('PushManager' in window)) return false;
  if (iosPushRequiresInstall()) return false;
  return true;
}

function readClientSiteName(): string {
  if (typeof document === 'undefined') return resolveSiteName(null);
  return resolveSiteName(document.documentElement.dataset.siteName);
}

export function pushUnsupportedReason(): string | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('PushManager' in window)) {
    return 'Push is not supported in this browser.';
  }
  if (iosPushRequiresInstall()) {
    const siteName = readClientSiteName();
    return `On iPhone/iPad, add ${siteName} to your Home Screen first, then open the app from that icon to enable push.`;
  }
  return null;
}
