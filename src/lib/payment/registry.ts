import type { CreateIntentInput, CreateIntentResult, PaymentGatewayId } from './types';
import { createUsdtPortalIntent } from './usdt-portal';
import { createPaypalIntent } from './paypal';
import { createStripeIntent } from './stripe';
import { prisma } from '@/lib/db';

export async function listEnabledGateways(): Promise<
  Array<{ id: PaymentGatewayId; label: string; description: string; ready: boolean }>
> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: true,
      paymentUsdtPortalApiKey: true,
      paymentUsdtPortalCallbackPassword: true,
      paymentPaypalEnabled: true,
      paymentPaypalClientId: true,
      paymentPaypalClientSecret: true,
      paymentStripeEnabled: true,
      paymentStripePublishableKey: true,
      paymentStripeSecretKey: true,
      paymentStripeWebhookSecret: true,
    },
  });
  const out: Array<{
    id: PaymentGatewayId;
    label: string;
    description: string;
    ready: boolean;
  }> = [];

  if (settings?.paymentUsdtPortalEnabled) {
    out.push({
      id: 'usdt_portal',
      label: 'USDT Portal',
      description: 'Hosted checkout · BEP20 / TRC20 / ERC20 / Binance',
      ready:
        !!settings.paymentUsdtPortalEmail &&
        !!settings.paymentUsdtPortalApiKey &&
        !!settings.paymentUsdtPortalCallbackPassword,
    });
  }
  if (settings?.paymentPaypalEnabled) {
    out.push({
      id: 'paypal',
      label: 'PayPal',
      description: 'Cards via PayPal Checkout',
      ready:
        !!settings.paymentPaypalClientId &&
        !!settings.paymentPaypalClientSecret,
    });
  }
  if (settings?.paymentStripeEnabled) {
    out.push({
      id: 'stripe',
      label: 'Stripe',
      description: 'Cards · Apple Pay · Google Pay',
      ready:
        !!settings.paymentStripePublishableKey &&
        !!settings.paymentStripeSecretKey &&
        !!settings.paymentStripeWebhookSecret,
    });
  }
  return out;
}

export async function createIntent(
  gateway: PaymentGatewayId,
  input: CreateIntentInput,
): Promise<CreateIntentResult> {
  switch (gateway) {
    case 'usdt_portal':
      return createUsdtPortalIntent(input);
    case 'paypal':
      return createPaypalIntent(input);
    case 'stripe':
      return createStripeIntent(input);
    default:
      return { ok: false, reason: 'unknown_gateway' };
  }
}
