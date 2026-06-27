'use client';

import { pushUnsupportedReason } from '@/lib/push/platform';

const SW_PATH = '/sw.js';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch {
    return null;
  }
}

export async function getPushPublicKey(): Promise<string | null> {
  const res = await fetch('/api/push/vapid-public-key');
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.publicKey) return null;
  return json.publicKey as string;
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  const blocked = pushUnsupportedReason();
  if (blocked) return { ok: false, error: blocked };

  if (!('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, error: 'Push not supported in this browser' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Notification permission denied' };
  }

  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration;
  const publicKey = await getPushPublicKey();
  if (!publicKey) return { ok: false, error: 'Push is not configured on the server' };

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  const res = await fetch('/api/user/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'subscribe',
      subscription: {
        endpoint: json.endpoint,
        keys: json.keys,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return { ok: false, error: data.error ?? 'Failed to save subscription' };
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch('/api/user/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unsubscribe', endpoint }),
    });
  }
}
