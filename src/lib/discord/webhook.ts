/**
 * Minimal Discord webhook notifier for catalog announcements.
 *
 * Config source priority:
 * 1) SiteSettings (admin UI): enabled + URL + required bot username + optional avatar
 * 2) ENV fallback (`DISCORD_WEBHOOK_ENABLED`, `DISCORD_WEBHOOK_URL`, `DISCORD_BOT_USERNAME`)
 *    only when DB settings are untouched (disabled + empty URL + empty username)
 */
import { prisma } from '@/lib/db';

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

const DISCORD_USERNAME_MAX = 80;

export function normalizeDiscordBotUsername(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const val = raw.trim().slice(0, DISCORD_USERNAME_MAX);
  return val || null;
}

function normalizeWebhookUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const val = raw.trim();
  return /^https:\/\/discord\.com\/api\/webhooks\//i.test(val) ? val : null;
}

function resolveBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/** Discord requires an absolute HTTPS avatar URL. */
export function resolveDiscordAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const val = raw.trim();
  if (/^https:\/\//i.test(val)) return val;
  if (val.startsWith('/')) {
    return `${resolveBaseUrl()}${val}`;
  }
  return null;
}

type DiscordWebhookConfig = {
  enabled: boolean;
  url: string | null;
  username: string | null;
  avatarUrl: string | null;
};

let cachedConfig: { value: DiscordWebhookConfig; expiresAt: number } | null = null;

async function getDiscordWebhookConfig(): Promise<DiscordWebhookConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) return cachedConfig.value;

  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      discordWebhookEnabled: true,
      discordWebhookUrl: true,
      discordBotUsername: true,
      discordBotAvatarUrl: true,
    },
  });
  const dbUrl = normalizeWebhookUrl(row?.discordWebhookUrl);
  const dbUsername = normalizeDiscordBotUsername(row?.discordBotUsername);
  const dbAvatar = resolveDiscordAvatarUrl(row?.discordBotAvatarUrl);

  // If DB config is untouched (disabled + empty URL + empty username), allow ENV fallback.
  if (row && row.discordWebhookEnabled === false && !dbUrl && !dbUsername) {
    const envCfg = {
      enabled: process.env.DISCORD_WEBHOOK_ENABLED === 'true',
      url: normalizeWebhookUrl(process.env.DISCORD_WEBHOOK_URL),
      username: normalizeDiscordBotUsername(process.env.DISCORD_BOT_USERNAME),
      avatarUrl: resolveDiscordAvatarUrl(process.env.DISCORD_BOT_AVATAR_URL),
    };
    cachedConfig = { value: envCfg, expiresAt: now + 30_000 };
    return envCfg;
  }

  const value = {
    enabled: row?.discordWebhookEnabled === true,
    url: dbUrl,
    username: dbUsername,
    avatarUrl: dbAvatar,
  };
  cachedConfig = { value, expiresAt: now + 30_000 };
  return value;
}

export function resetDiscordWebhookConfigCache(): void {
  cachedConfig = null;
}

function envWebhookUrl(): string | null {
  return normalizeWebhookUrl(process.env.DISCORD_WEBHOOK_URL);
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

async function sendEmbed(embed: DiscordEmbed): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getDiscordWebhookConfig();
  if (!cfg.enabled) return { ok: false, error: 'Discord webhook is disabled' };
  if (!cfg.url) return { ok: false, error: 'Discord webhook URL is missing or invalid' };
  if (!cfg.username) return { ok: false, error: 'Discord bot username is required' };

  const body: Record<string, unknown> = {
    username: cfg.username,
    embeds: [embed],
  };
  if (cfg.avatarUrl) {
    body.avatar_url = cfg.avatarUrl;
  }

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[discord.webhook] send failed', res.status, text);
      return { ok: false, error: `Discord API ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('[discord.webhook] network error', e);
    return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
  }
}

export async function postDiscordTestMessage(siteName = 'NexusServer'): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getDiscordWebhookConfig();
  if (!cfg.enabled) return { ok: false, error: 'Discord webhook is disabled' };
  if (!cfg.url) {
    const envUrl = envWebhookUrl();
    if (!envUrl) return { ok: false, error: 'Discord webhook URL is missing or invalid' };
  }
  if (!cfg.username) {
    return { ok: false, error: 'Discord bot username is required' };
  }
  return sendEmbed({
    title: 'Discord Webhook Connected',
    description: `Test message from **${siteName}**`,
    color: 0x5865f2,
    url: resolveBaseUrl(),
    fields: [{ name: 'Status', value: 'Webhook is working', inline: true }],
  });
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
