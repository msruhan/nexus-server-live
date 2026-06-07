# USDT Portal setup — NexusServer

Each NexusServer deployment configures **its own** USDT Portal merchant account in **Admin → Payments**. Funds from wallet top-ups go to that deployer's account.

**Do not** use NexusPortal credentials here.

## 1. Website type

Choose **DHRU FUSION / PHP / OTHER** in USDT Portal Connection Settings — not Dhru Fusion Pro.

You do **not** need to upload `usdtportal_callback.php`; NexusServer implements the same handler at:

`/api/payment/usdt-portal/callback`

## 2. Connection Settings (USDT Portal panel)

| Field | Value |
|-------|--------|
| Website type | DHRU FUSION / PHP / OTHER |
| Callback URL | `yourdomain.com/api/payment/usdt-portal/callback` *(no https/www)* |
| Secret Callback Password | Same as Admin → Payments |
| Website security | `https` |
| URL version | `without www` |

## 3. NexusServer admin

**Admin → Payments → USDT Portal**

| Field | Notes |
|-------|--------|
| Account email | USDT Portal merchant email |
| API key | From Connection Settings |
| Secret callback password | From Connection Settings |
| USD per 1 USDT | Default `1.0` (peg); optional spread |

## 4. IP whitelist

- Whitelist **161.97.165.102** (USDT Portal)
- Whitelist your **deployment public IP** (403 on place-order if missing)

## 5. Test

1. **Test Callback** in USDT Portal panel → credentials match.
2. **User → Wallet → Online top-up** → USDT → pay → balance credited.

## Multi-deployment

Every buyer of NexusServer who deploys their own instance follows this guide with **their** USDT Portal account — same steps, different credentials.

## Reference

- [DHRU-PHP-API-usdtportal.com](https://github.com/usdtportal/DHRU-PHP-API-usdtportal.com)
