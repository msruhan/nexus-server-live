/**
 * Centralized event types so a typo at a callsite doesn't silently mute
 * a notification. Keep this list in sync with the admin SMTP "events"
 * picker.
 */
export type EmailEvent =
  | 'ticket.reply'
  | 'ticket.status_changed'
  | 'order.imei.created'
  | 'order.imei.success'
  | 'order.imei.rejected'
  | 'order.server.created'
  | 'order.server.success'
  | 'order.server.rejected'
  | 'wallet.topup_approved'
  | 'wallet.topup_rejected'
  | 'payment.credited'
  | 'auth.password_changed'
  | 'backup.created';

export const ALL_EMAIL_EVENTS: EmailEvent[] = [
  'ticket.reply',
  'ticket.status_changed',
  'order.imei.created',
  'order.imei.success',
  'order.imei.rejected',
  'order.server.created',
  'order.server.success',
  'order.server.rejected',
  'wallet.topup_approved',
  'wallet.topup_rejected',
  'payment.credited',
  'auth.password_changed',
  'backup.created',
];

/** Mail attachment. Provide `path` (file on disk) or `content` (buffer/string). */
export type EmailAttachment = {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  event: EmailEvent;
  refType?: string;
  refId?: string;
  attachments?: EmailAttachment[];
  /**
   * When true, send regardless of the admin's per-event allow-list. Use for
   * explicit admin-triggered sends (e.g. emailing a backup) that should
   * never be silently muted by the events filter.
   */
  force?: boolean;
};
