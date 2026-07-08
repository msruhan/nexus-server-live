/**
 * Minimal Discord webhook notifier for catalog announcements.
 *
 * Config source priority:
 * 1) SiteSettings.discordWebhookEnabled + SiteSettings.discordWebhookUrl (admin UI)
 * 2) ENV fallback (`DISCORD_WEBHOOK_ENABLED`, `DISCORD_WEBHOOK_URL`)
 */
import { prisma } from '@/lib/db';

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

function normalizeWebhookUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const val = raw.trim();
  return /^https:\/\/discord\.com\/api\/webhooks\//i.test(val) ? val : null;
}

type DiscordWebhookConfig = {
  enabled: boolean;
  url: string | null;
};

let cachedConfig: { value: DiscordWebhookConfig; expiresAt: number } | null = null;

async function getDiscordWebhookConfig(): Promise<DiscordWebhookConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) return cachedConfig.value;

  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { discordWebhookEnabled: true, discordWebhookUrl: true },
  });
  const dbUrl = normalizeWebhookUrl(row?.discordWebhookUrl);

  // If DB config is untouched (disabled + empty URL), allow ENV fallback.
  if (row && row.discordWebhookEnabled === false && !dbUrl) {
    const envCfg = {
      enabled: process.env.DISCORD_WEBHOOK_ENABLED === 'true',
      url: normalizeWebhookUrl(process.env.DISCORD_WEBHOOK_URL),
    };
    cachedConfig = { value: envCfg, expiresAt: now + 30_000 };
    return envCfg;
  }

  const value = {
    enabled: row?.discordWebhookEnabled === true,
    url: dbUrl,
  };
  cachedConfig = { value, expiresAt: now + 30_000 };
  return value;
}

export function resetDiscordWebhookConfigCache(): void {
  cachedConfig = null;
}

function envWebhookUrl(): string | null {
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim();
  return raw && /^https:\/\/discord\.com\/api\/webhooks\//i.test(raw) ? raw : null;
}

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

async function sendEmbed(embed: DiscordEmbed): Promise<void> {
  const cfg = await getDiscordWebhookConfig();
  if (!cfg.enabled) return;
  const url = cfg.url;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Recovero Catalog Bot',
        embeds: [embed],
      }),
    });
    if (!res.ok) {
      console.error('[discord.webhook] send failed', res.status, await res.text());
    }
  } catch (e) {
    console.error('[discord.webhook] network error', e);
  }
}

export async function postDiscordTestMessage(siteName = 'NexusServer'): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getDiscordWebhookConfig();
  if (!cfg.enabled) return { ok: false, error: 'Discord webhook is disabled' };
  if (!cfg.url) {
    const envUrl = envWebhookUrl();
    if (!envUrl) return { ok: false, error: 'Discord webhook URL is missing or invalid' };
  }
  try {
    await sendEmbed({
      title: 'Discord Webhook Connected',
      description: `Test message from **${siteName}**`,
      color: 0x5865f2,
      url: resolveBaseUrl(),
      fields: [{ name: 'Status', value: 'Webhook is working', inline: true }],
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send_failed' };
  }
}

export async function postDiscordNewService(input: {
  title: string;
  category: string;
  price: number | string;
  deliveryTime?: string | null;
}): Promise<void> {
  const siteUrl = resolveBaseUrl();
  await sendEmbed({
    title: 'New Service Available',
    description: `**${input.title}**`,
    color: 0x57f287,
    url: `${siteUrl}/marketplace`,
    fields: [
      { name: 'Category', value: input.category, inline: true },
      { name: 'Price', value: fmtUsd(input.price), inline: true },
      ...(input.deliveryTime ? [{ name: 'Delivery', value: input.deliveryTime, inline: true }] : []),
    ],
  });
}

export async function postDiscordPriceUpdate(input: {
  title: string;
  oldPrice: number | string;
  newPrice: number | string;
}): Promise<void> {
  const siteUrl = resolveBaseUrl();
  await sendEmbed({
    title: 'Price Update',
    description: `**${input.title}**`,
    color: 0xfee75c,
    url: `${siteUrl}/marketplace`,
    fields: [
      { name: 'Old Price', value: fmtUsd(input.oldPrice), inline: true },
      { name: 'New Price', value: fmtUsd(input.newPrice), inline: true },
    ],
  });
}
