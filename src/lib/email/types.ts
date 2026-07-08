/**
 * Centralized event types so a typo at a callsite doesn't silently mute
 * a notification. Keep this list in sync with the admin SMTP "events"
 * picker.
 */
export type EmailEvent =
  | 'auth.registered'
  | 'auth.email_verification'
  | 'auth.password_changed'
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
  | 'backup.created'
  | 'admin.order.new'
  | 'admin.topup.new'
  | 'admin.ticket.new'
  | 'admin.report.scheduled';

export const ALL_EMAIL_EVENTS: EmailEvent[] = [
  'auth.registered',
  'auth.email_verification',
  'auth.password_changed',
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
  'backup.created',
  'admin.order.new',
  'admin.topup.new',
  'admin.ticket.new',
  'admin.report.scheduled',
];

export const EMAIL_EVENT_GROUPS: Array<{
  title: string;
  events: Array<{ key: EmailEvent; label: string }>;
}> = [
  {
    title: 'Account',
    events: [
      { key: 'auth.registered', label: 'Welcome — new registration' },
      { key: 'auth.email_verification', label: 'Email verification link' },
      { key: 'auth.password_changed', label: 'Password changed' },
    ],
  },
  {
    title: 'Support',
    events: [
      { key: 'ticket.reply', label: 'Ticket reply from staff' },
      { key: 'ticket.status_changed', label: 'Ticket status updated' },
    ],
  },
  {
    title: 'Orders',
    events: [
      { key: 'order.imei.created', label: 'IMEI order placed' },
      { key: 'order.imei.success', label: 'IMEI order completed' },
      { key: 'order.imei.rejected', label: 'IMEI order rejected' },
      { key: 'order.server.created', label: 'Server order placed' },
      { key: 'order.server.success', label: 'Server order completed' },
      { key: 'order.server.rejected', label: 'Server order rejected' },
    ],
  },
  {
    title: 'Wallet & payments',
    events: [
      { key: 'wallet.topup_approved', label: 'Top-up approved' },
      { key: 'wallet.topup_rejected', label: 'Top-up rejected' },
      { key: 'payment.credited', label: 'Payment credited' },
    ],
  },
  {
    title: 'System',
    events: [{ key: 'backup.created', label: 'Database backup ready' }],
  },
  {
    title: 'Admin alerts',
    events: [
      { key: 'admin.order.new', label: 'New order placed' },
      { key: 'admin.topup.new', label: 'New top-up request' },
      { key: 'admin.ticket.new', label: 'New support ticket' },
      { key: 'admin.report.scheduled', label: 'Scheduled analytics report' },
    ],
  },
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
