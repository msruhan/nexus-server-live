/**
 * Telegram channel & group auto-post helpers.
 *
 * Posts when services are published or prices are updated. Fire-and-forget —
 * never blocks the admin action.
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

async function deliverAutoPost(text: string): Promise<void> {
  const settings = await loadSettings();
  if (!settings) return;

  const sendOpts = {
    text,
    parseMode: 'HTML' as const,
    disableWebPagePreview: true,
  };

  if (settings.channelEnabled && settings.channelId) {
    await sendMessage({
      chatId: settings.channelId,
      ...sendOpts,
    });
  }

  if (
    settings.groupEnabled &&
    settings.groupId &&
    settings.groupTopicId != null &&
    settings.groupTopicId > 0
  ) {
    await sendMessage({
      chatId: settings.groupId,
      messageThreadId: settings.groupTopicId,
      ...sendOpts,
    });
  }
}

/**
 * Post when a new service is published (status → ACTIVE).
 */
export async function postNewService(input: {
  title: string;
  category: string;
  price: number | string;
  deliveryTime?: string | null;
}) {
  try {
    const text = tpl.channelNewServiceTemplate({
      title: input.title,
      category: input.category,
      price: fmtUsd(input.price),
      deliveryTime: input.deliveryTime,
      siteUrl: resolveBaseUrl(),
    });
    await deliverAutoPost(text);
  } catch (e) {
    console.error('[telegram.channel] postNewService', e);
  }
}

/**
 * Post when a service price is updated.
 */
export async function postPriceUpdate(input: {
  title: string;
  oldPrice: number | string;
  newPrice: number | string;
}) {
  try {
    const text = tpl.channelPriceUpdateTemplate({
      title: input.title,
      oldPrice: fmtUsd(input.oldPrice),
      newPrice: fmtUsd(input.newPrice),
      siteUrl: resolveBaseUrl(),
    });
    await deliverAutoPost(text);
  } catch (e) {
    console.error('[telegram.channel] postPriceUpdate', e);
  }
}
