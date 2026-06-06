# Security Audit Responses

Responses to findings from the 2026-06-06 security scan (shared with the Vercel demo deployment).

## 1. Missing Content-Security-Policy — Fixed

**Status:** Remediated in `next.config.mjs`.

CSP is applied to all routes via Next.js `headers()`. Directives allow:

- Inline styles for CMS palette injection (`style-src 'unsafe-inline'`)
- Stripe / PayPal checkout (`script-src`, `frame-src`, `connect-src`)
- USDT Portal (`connect-src https://usdtportal.com`)
- License portal API (`connect-src` includes `NEXUS_LICENSE_SERVER_URL` when set to HTTPS at image build time)

**Docker / Coolify:** License API calls run server-side and are not gated by browser CSP. For Vercel-style builds, set `NEXUS_LICENSE_SERVER_URL` before `npm run build` so the CSP includes the portal origin.

## 2. BREACH / Server Compression — Accepted Risk

**Status:** No code change.

Reverse proxies (Caddy, nginx, Vercel edge) commonly compress responses. NextAuth CSRF tokens use httpOnly cookies, so practical BREACH risk is low. Disabling compression would hurt performance without meaningful gain.

## 3. `x-vercel-id` Header — Informational (Vercel only)

**Status:** Not applicable to Coolify / customer VPS deployments.

## 4. TLS / Custom Domain — Mitigate in Production

**Status:** Infrastructure recommendation.

Use a dedicated customer domain with valid TLS in Coolify/Caddy. Avoid relying on shared platform hostnames for production traffic.
