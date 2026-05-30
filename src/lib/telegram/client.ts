/**
 * Telegram Bot API client — raw fetch, no external SDK.
 *
 * Design:
 *   - Mirrors the usdt-portal.ts pattern (raw fetch to external API).
 *   - Settings loaded lazily from SiteSettings with 60s cache.
 *   - All public functions are safe to call even when Telegram is disabled
 *     (they return early with ok=false).
 */
import { prisma } from '@/lib/db';
import type {
  TelegramSettings,
  SendMessageOptions,
  InlineKeyboardMarkup,
  TelegramUserEvent,
  TelegramAdminEvent,
} from './types';

const API_BASE = 'https://api.telegram.org/bot';
const CACHE_TTL_MS = 60_000;

let cachedSettings: TelegramSettings | null = null;
let cacheLoadedAt = 0;

export async function loadSettings(): Promise<TelegramSettings | null> {
  const now = Date.now();
  if (cachedSettings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      telegramBotEnabled: true,
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramWebhookSecret: true,
      telegramAdminChatId: true,
      telegramChannelId: true,
      telegramChannelEnabled: true,
      telegramUserEvents: true,
      telegramAdminEvents: true,
    },
  });
  if (!row || !row.telegramBotEnabled || !row.telegramBotToken) {
    cachedSettings = null;
    cacheLoadedAt = now;
    return null;
  }
  cachedSettings = {
    enabled: true,
    botToken: row.telegramBotToken,
    botUsername: row.telegramBotUsername ?? '',
    webhookSecret: row.telegramWebhookSecret ?? '',
    adminChatId: row.telegramAdminChatId ?? null,
    channelId: row.telegramChannelId ?? null,
    channelEnabled: row.telegramChannelEnabled,
    // null = all enabled. Split CSV into trimmed list.
    userEvents:
      row.telegramUserEvents === null
        ? []
        : row.telegramUserEvents.split(',').map((s) => s.trim()).filter(Boolean),
    adminEvents:
      row.telegramAdminEvents === null
        ? []
        : row.telegramAdminEvents.split(',').map((s) => s.trim()).filter(Boolean),
  };
  cacheLoadedAt = now;
  return cachedSettings;
}

/**
 * Whether a user-facing / admin notification event is enabled.
 *
 * Stored-value semantics (telegramUserEvents / telegramAdminEvents):
 *   - DB null            → loader yields []  → ALL enabled (legacy default).
 *   - DB "none"          → loader yields ['none'] → ALL disabled.
 *   - DB "a,b,c"         → loader yields ['a','b','c'] → only those enabled.
 *
 * This keeps existing deployments (null column) sending every event, while
 * letting the admin opt into a specific subset — or disable everything.
 */
function eventEnabled(list: string[], event: string): boolean {
  if (list.length === 0) return true; // all enabled (default)
  if (list.includes('none')) return false; // explicitly disabled all
  return list.includes(event);
}

export function isUserEventEnabled(settings: TelegramSettings, event: TelegramUserEvent): boolean {
  return eventEnabled(settings.userEvents, event);
}

export function isAdminEventEnabled(settings: TelegramSettings, event: TelegramAdminEvent): boolean {
  return eventEnabled(settings.adminEvents, event);
}

/** Force re-read settings on next call (used after admin saves config). */
export function resetSettingsCache() {
  cachedSettings = null;
  cacheLoadedAt = 0;
}

// ─── Low-level API calls ────────────────────────────────────────

async function apiCall<T = unknown>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string }> {
  try {
    const res = await fetch(`${API_BASE}${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    return json as { ok: boolean; result?: T; description?: string };
  } catch (e) {
    console.error(`[telegram] apiCall ${method} failed:`, e);
    return { ok: false, description: e instanceof Error ? e.message : 'network_error' };
  }
}

// ─── Public helpers ─────────────────────────────────────────────

/**
 * Send a text message. Returns ok + message_id on success.
 */
export async function sendMessage(
  opts: SendMessageOptions,
  tokenOverride?: string,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = tokenOverride ?? (await loadSettings())?.botToken;
  if (!token) return { ok: false, error: 'telegram_not_configured' };

  const body: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text,
  };
  if (opts.parseMode) body.parse_mode = opts.parseMode;
  if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;
  if (opts.disableWebPagePreview) body.disable_web_page_preview = true;

  const res = await apiCall<{ message_id: number }>(token, 'sendMessage', body);
  if (!res.ok) return { ok: false, error: res.description ?? 'send_failed' };
  return { ok: true, messageId: res.result?.message_id };
}

/**
 * Get bot info (getMe). Used to verify token and cache username.
 */
export async function getMe(token: string): Promise<{
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}> {
  const res = await apiCall<{ username?: string; first_name?: string }>(token, 'getMe');
  if (!res.ok) return { ok: false, error: res.description ?? 'getMe_failed' };
  return { ok: true, username: res.result?.username, firstName: res.result?.first_name };
}

/**
 * Set webhook URL for the bot.
 */
export async function setWebhook(
  token: string,
  url: string,
  secretToken?: string,
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { url };
  if (secretToken) body.secret_token = secretToken;
  body.allowed_updates = ['message', 'callback_query'];
  const res = await apiCall(token, 'setWebhook', body);
  if (!res.ok) return { ok: false, error: res.description ?? 'setWebhook_failed' };
  return { ok: true };
}

/**
 * Delete webhook (useful when disabling).
 */
export async function deleteWebhook(token: string): Promise<{ ok: boolean }> {
  const res = await apiCall(token, 'deleteWebhook');
  return { ok: res.ok };
}

/**
 * Get current webhook info.
 */
export async function getWebhookInfo(token: string): Promise<{
  ok: boolean;
  url?: string;
  pendingUpdateCount?: number;
  error?: string;
}> {
  const res = await apiCall<{ url?: string; pending_update_count?: number }>(
    token,
    'getWebhookInfo',
  );
  if (!res.ok) return { ok: false, error: res.description };
  return {
    ok: true,
    url: res.result?.url,
    pendingUpdateCount: res.result?.pending_update_count,
  };
}

/**
 * Build an inline keyboard markup helper.
 */
export function inlineKeyboard(rows: Array<Array<{ text: string; url?: string; data?: string }>>): InlineKeyboardMarkup {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((btn) => {
        const b: { text: string; url?: string; callback_data?: string } = { text: btn.text };
        if (btn.url) b.url = btn.url;
        if (btn.data) b.callback_data = btn.data;
        return b;
      }),
    ),
  };
}
