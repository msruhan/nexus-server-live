# Stripe setup — NexusServer

Each NexusServer deployment configures **its own** Stripe account in **Admin → Payments**. Wallet top-ups go to that deployer's Stripe account.

**Do not** use NexusPortal credentials here.

## 1. Create Stripe keys

1. [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers → API keys** (Test mode first).
2. Copy **Publishable key** and **Secret key**.

## 2. Register webhook

1. **Developers → Webhooks** → **Add endpoint**.
2. **URL:** `https://<your-domain>/api/payment/stripe/webhook`
3. **Events:**
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Copy **Signing secret** (`whsec_…`) into Admin → Payments.

Wallet credit runs only when `payment_status === 'paid'` (or on `async_payment_succeeded`).

## 3. NexusServer admin

**Admin → Payments → Stripe**

| Field | Notes |
|-------|--------|
| Enable Stripe | On |
| Publishable key | `pk_test_…` or live |
| Secret key | Write-only; blank keeps existing |
| Webhook secret | `whsec_…` from step 2 |

Checkout uses hosted redirect (`session.url`). Currency is USD.

## 4. Test

1. **User → Wallet → Online top-up** → Stripe → complete with [test card](https://docs.stripe.com/testing#cards).
2. Balance credited after webhook (success page may poll until confirmed).
3. Stripe Dashboard → send test `checkout.session.completed` → endpoint returns `200`.

Local forwarding:

```bash
stripe listen --forward-to localhost:3000/api/payment/stripe/webhook
```

## Multi-deployment

Every buyer who deploys their own NexusServer instance follows this guide with **their** Stripe account — same steps, different credentials.

## Reference

- [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions)
- Design (Portal repo): `NexusPortal/docs/superpowers/specs/2026-06-07-stripe-payment-gateway-design.md`
