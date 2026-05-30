/**
 * Telegram Bot types.
 */

export type TelegramSettings = {
  enabled: boolean;
  botToken: string;
  botUsername: string;
  webhookSecret: string;
  adminChatId: string | null;
  channelId: string | null;
  channelEnabled: boolean;
  userEvents: string[]; // empty array = all enabled
  adminEvents: string[]; // empty array = all enabled
};

// ─── Notification events ────────────────────────────────────────
// Catalog of all notification events that can be toggled in the admin
// Telegram settings page. The `null` stored value means "all enabled"
// (default, non-breaking). An empty string means "none".

export type TelegramUserEvent =
  | 'order.created'
  | 'order.success'
  | 'order.rejected'
  | 'payment.credited'
  | 'ticket.reply';

export type TelegramAdminEvent =
  | 'admin.order.new'
  | 'admin.topup.new'
  | 'admin.ticket.new';

export const TELEGRAM_USER_EVENTS: Array<{ key: TelegramUserEvent; label: string; description: string }> = [
  { key: 'order.created', label: 'Order placed', description: 'When the user successfully places a new order' },
  { key: 'order.success', label: 'Order completed', description: 'When an order is completed successfully' },
  { key: 'order.rejected', label: 'Order rejected', description: 'When an order is rejected by the supplier' },
  { key: 'payment.credited', label: 'Payment received', description: 'When a wallet top-up / payment is credited' },
  { key: 'ticket.reply', label: 'Ticket reply', description: 'When an admin replies to their support ticket' },
];

export const TELEGRAM_ADMIN_EVENTS: Array<{ key: TelegramAdminEvent; label: string; description: string }> = [
  { key: 'admin.order.new', label: 'New order', description: 'When any user places a new order' },
  { key: 'admin.topup.new', label: 'New top-up request', description: 'When a user submits a top-up request' },
  { key: 'admin.ticket.new', label: 'New support ticket', description: 'When a user opens a new support ticket' },
];

/** Subset of Telegram Bot API Update object */
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: Array<{ type: string; offset: number; length: number }>;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export type SendMessageOptions = {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: InlineKeyboardMarkup;
  disableWebPagePreview?: boolean;
};
