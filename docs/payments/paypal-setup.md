# PayPal setup — NexusServer

Each NexusServer deployment uses **its own** PayPal Developer App. Reseller wallet top-ups are credited to the **deployer's** PayPal merchant account.

**Do not** paste NexusPortal credentials here. Each customer who buys NexusServer should create their own app.

## 1. Create a PayPal app

1. Open [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Create app (e.g. `Acme Reseller Panel`).
3. Copy **Client ID** and **Secret** (Sandbox first).

## 2. Register webhook

1. **Webhooks** → Add webhook.
2. **URL:** `https://<your-server-domain>/api/payment/paypal/webhook`
3. **Events:**
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
4. Copy the **Webhook ID**.

## 3. Configure admin

**Admin → Payments → PayPal**

| Field | Value |
|-------|--------|
| Client ID | From step 1 |
| Client secret | From step 1 |
| Mode | `sandbox` until tested |
| Webhook ID | From step 2 |

PayPal top-up is offered only when enabled **and** all fields are complete.

## 4. Sandbox test

1. Create sandbox business + personal test accounts.
2. **User → Wallet → Online top-up** → PayPal → approve payment.
3. Confirm wallet balance increases.
4. Close tab after approving — webhook should still credit the wallet.

## 5. Go live

1. Use Live Client ID / Secret from PayPal.
2. Register live webhook on production domain.
3. Set Mode to **live** in admin.

## Multi-tenant note

| Deployment | PayPal app owner |
|------------|------------------|
| Vendor's own NexusServer | Vendor's PayPal app |
| Customer A's NexusServer | Customer A's PayPal app |
| Customer B's NexusServer | Customer B's PayPal app |

## Reference

- [PayPal Orders v2 API](https://developer.paypal.com/docs/api/orders/v2/)
- [OpenAPI specs](https://github.com/paypal/paypal-rest-api-specifications)
