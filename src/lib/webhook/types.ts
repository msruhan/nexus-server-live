/**
 * Outgoing webhook types + event catalog.
 *
 * Events mirror the notification events used elsewhere (email/telegram) so
 * resellers get the same lifecycle signals via their own integration.
 */

export type WebhookEvent =
  | 'order.success'
  | 'order.rejected'
  | 'order.created'
  | 'payment.credited';

export const WEBHOOK_EVENTS: Array<{ key: WebhookEvent; label: string; description: string }> = [
  { key: 'order.created', label: 'Order created', description: 'Fires when a new order is placed (IMEI or Server).' },
  { key: 'order.success', label: 'Order success', description: 'Fires when an order completes successfully.' },
  { key: 'order.rejected', label: 'Order rejected', description: 'Fires when an order is rejected by the supplier.' },
  { key: 'payment.credited', label: 'Payment credited', description: 'Fires when a wallet top-up is credited.' },
];

/** Standard envelope POSTed to the reseller endpoint. */
export type WebhookPayload = {
  id: string; // delivery id (idempotency key for the receiver)
  event: WebhookEvent;
  createdAt: string; // ISO timestamp of the event
  data: Record<string, unknown>;
};

export function parseEventList(csv: string | null | undefined): WebhookEvent[] {
  if (csv == null) return []; // null = all (caller decides)
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as WebhookEvent[];
}

/** An endpoint subscribes to an event if its list is empty (all) or includes it. */
export function endpointWantsEvent(eventsCsv: string | null | undefined, event: WebhookEvent): boolean {
  const list = parseEventList(eventsCsv);
  if (list.length === 0) return true; // all events
  return list.includes(event);
}
