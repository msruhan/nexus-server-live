/**
 * Telegram channel auto-post helpers.
 *
 * Posts to the configured channel when services are published or
 * prices are updated. Fire-and-forget — never blocks the admin action.
 */
import { loadSettings, sendMessage } from './client';
import * as tpl from './templates';

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function fmtUsd(n: number | string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/**
 * Post to channel when a new service is published (status → ACTIVE).
 */
export async function postNewService(input: {
  title: string;
  category: string;
  price: number | string;
  deliveryTime?: string | null;
}) {
  try {
    const settings = await loadSettings();
    if (!settings?.channelEnabled || !settings.channelId) return;

    const text = tpl.channelNewServiceTemplate({
      title: input.title,
      category: input.category,
      price: fmtUsd(input.price),
      deliveryTime: input.deliveryTime,
      siteUrl: resolveBaseUrl(),
    });
    await sendMessage({
      chatId: settings.channelId,
      text,
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });
  } catch (e) {
    console.error('[telegram.channel] postNewService', e);
  }
}

/**
 * Post to channel when a service price is updated.
 */
export async function postPriceUpdate(input: {
  title: string;
  oldPrice: number | string;
  newPrice: number | string;
}) {
  try {
    const settings = await loadSettings();
    if (!settings?.channelEnabled || !settings.channelId) return;

    const text = tpl.channelPriceUpdateTemplate({
      title: input.title,
      oldPrice: fmtUsd(input.oldPrice),
      newPrice: fmtUsd(input.newPrice),
      siteUrl: resolveBaseUrl(),
    });
    await sendMessage({
      chatId: settings.channelId,
      text,
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });
  } catch (e) {
    console.error('[telegram.channel] postPriceUpdate', e);
  }
}
