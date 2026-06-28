'use client';

import * as React from 'react';
import { X, DeviceMobile, DownloadSimple, ShareNetwork } from '@phosphor-icons/react';
import { useSiteName } from '@/lib/site-name-client';
import { registerServiceWorker } from '@/lib/push/client';
import { isIosDevice, isStandalonePwa } from '@/lib/push/platform';
import { IosInstallSteps } from '@/components/pwa/IosInstallSteps';

const DISMISS_KEY = 'pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type BannerMode = 'none' | 'ios' | 'android';

export function PwaShell() {
  const siteName = useSiteName();
  const [mode, setMode] = React.useState<BannerMode>('none');
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    void registerServiceWorker();

    if (typeof window === 'undefined') return;
    if (isStandalonePwa()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    if (isIosDevice()) {
      setMode('ios');
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('android');
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setMode('none');
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setMode('none');
  }

  if (mode === 'none') return null;

  const isIos = mode === 'ios';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-xl border border-line bg-paper p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            {isIos ? (
              <ShareNetwork size={22} weight="duotone" />
            ) : (
              <DeviceMobile size={22} weight="duotone" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold tracking-tight text-ink">
              {isIos ? `Add ${siteName} to Home Screen` : `Install ${siteName}`}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {isIos
                ? 'On iPhone and iPad, install the app to your home screen for push notifications and quick access.'
                : 'Add to your home screen for quick access and order notifications.'}
            </p>
            {isIos ? (
              <IosInstallSteps siteName={siteName} />
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  disabled={installing || !deferredPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-paper disabled:opacity-50"
                >
                  <DownloadSimple size={14} weight="bold" />
                  {installing ? 'Installing…' : 'Install app'}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-paper-100"
                >
                  Not now
                </button>
              </div>
            )}
            {isIos && (
              <button
                type="button"
                onClick={handleDismiss}
                className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-paper-100"
              >
                Not now
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1 text-ink-muted hover:bg-paper-100"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
