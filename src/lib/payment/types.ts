/**
 * Payment gateway abstraction.
 *
 * Each gateway implements `createIntent` (presents the user with whatever
 * they need to pay — address, redirect URL, embedded form). The actual
 * crediting happens via `confirmIntentByGatewayPayload` (called from
 * webhook handlers) or `pollPendingIntents` (called for crypto where we
 * watch the chain).
 *
 * Designed to be DRY: the wallet credit + ledger entry path is owned by
 * `creditWalletForIntent` (one place), so individual gateways never touch
 * wallet directly.
 */
import type { Decimal } from '@prisma/client/runtime/library';

export type PaymentGatewayId = 'usdt_portal' | 'paypal' | 'stripe';

export type CreateIntentInput = {
  userId: string;
  amount: Decimal | number; // USD
  reference: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateIntentResult =
  | {
      ok: true;
      // Crypto: { kind: "crypto", address, expectedAsset, expectedAmount }
      // Fiat redirect: { kind: "redirect", url }
      // Fiat embedded: { kind: "embedded", clientSecret, publishableKey }
      payload: CryptoPayload | RedirectPayload | EmbeddedPayload;
    }
  | { ok: false; reason: string };

export type CryptoPayload = {
  kind: 'crypto';
  address: string;
  asset: string;
  amount: string;
  network: string;
  rate: string; // IDR per 1 unit asset (display only)
  expiresAt: string;
};

export type RedirectPayload = {
  kind: 'redirect';
  url: string;
};

export type EmbeddedPayload = {
  kind: 'embedded';
  clientSecret: string;
  publishableKey: string;
};

export type GatewayContext = {
  // Settings hydrated by the gateway loader. Keys depend on gateway.
  settings: Record<string, string | number | boolean | null | undefined>;
};
