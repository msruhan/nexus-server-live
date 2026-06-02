/**
 * Shared, additive parser for the optional Dhru-compatible order callback
 * inputs (`feedback_url`, `reference_id`, `Quantity`).
 *
 * Used by the public v1 JSON endpoints AND the Classic /api/index.php
 * endpoint. Accepts every common naming convention (snake_case from Dhru,
 * camelCase, UPPERCASE classic params) so callers can use whichever they
 * already use. When nothing is supplied, returns empty/defaults so the
 * order behaves exactly as before.
 *
 * The feedback URL is SSRF-validated with the same guard as outgoing
 * webhooks; an invalid URL is dropped (not persisted) rather than failing
 * the order — the order itself must never break because of a bad callback.
 */
import { validateWebhookUrl } from '@/lib/webhook/security';

export type FeedbackInput = {
  /** Caller-supplied idempotency / reference key (echoed back). */
  callerReference: string | null;
  /** Validated callback URL, or null if absent/invalid. */
  feedbackUrl: string | null;
  /** Requested quantity (>= 1). Defaults to 1. */
  quantity: number;
};

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) return t;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      return String(v);
    }
  }
  return null;
}

function resolveQuantity(...vals: unknown[]): number {
  const raw = firstString(...vals);
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 9999);
}

/**
 * Extract feedback inputs from an arbitrary record (JSON body or merged
 * classic params). Never throws.
 */
export function extractFeedbackInput(src: Record<string, unknown> | null | undefined): FeedbackInput {
  const s = src ?? {};
  const callerReference = firstString(
    s.reference_id,
    s.referenceId,
    s.REFERENCE_ID,
    s.REFERENCEID,
    s.customreference,
    s.CUSTOMREFERENCE,
  );

  const rawUrl = firstString(s.feedback_url, s.feedbackUrl, s.FEEDBACK_URL, s.FEEDBACKURL, s.callback_url, s.callbackUrl);
  let feedbackUrl: string | null = null;
  if (rawUrl) {
    const check = validateWebhookUrl(rawUrl);
    if (check.ok) feedbackUrl = rawUrl;
  }

  const quantity = resolveQuantity(s.quantity, s.Quantity, s.QUANTITY, s.QNT, s.qnt);

  return { callerReference, feedbackUrl, quantity };
}
