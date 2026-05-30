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
  | 'auth.password_changed';

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
];

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  event: EmailEvent;
  refType?: string;
  refId?: string;
};
