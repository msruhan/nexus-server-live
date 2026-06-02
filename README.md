# Nexus Server

Self-service bureau for IMEI &amp; Server services with DhruFusion integration.

Built per [PRD-IMEI-SERVER-SERVICES.md](./PRD-IMEI-SERVER-SERVICES.md).

## Quick start

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

### Demo credentials

| Role  | Email             | Password |
| ----- | ----------------- | -------- |
| Admin | admin@nexus.id    | admin123 |
| User  | reseller@demo.id  | user1234 |

The seeded user already has `$100.00` in the wallet.

## Stack

- **Next.js 15** App Router + TypeScript strict
- **Prisma** + **SQLite** (dev) — change `provider` to `postgresql` for prod
- **NextAuth v5** (Credentials)
- **Tailwind 3.4** + **Framer Motion 11** + **Phosphor Icons**
- **Zod** for input validation
- **Sonner** for toast notifications

## Routes

### Public
- `/` — landing page (editorial design)
- `/services`, `/services/imei`, `/services/imei/[groupId]`, `/services/server` — catalog
- `/login`, `/register`

### User dashboard
- `/user/dashboard` — overview KPI + recent orders
- `/user/orders`, `/user/orders/[id]` — list + detail with timeline + result code copy
- `/user/orders/new/imei/[serviceId]`, `/user/orders/new/server/[serviceId]` — order forms
- `/user/wallet` — balance, top-up form, ledger
- `/user/settings` — profile + password

### Admin dashboard
- `/admin/dashboard` — bureau KPIs (revenue, success rate, in-flight)
- `/admin/orders`, `/admin/orders/[id]` — monitor + cancel/refund
- `/admin/providers`, `/admin/providers/[id]`, `/admin/providers/new` — Dhru CRUD + test/sync actions
- `/admin/services/imei`, `/admin/services/server` — inline price + status edit
- `/admin/wallet` — top-up approve/reject
- `/admin/users` — list + activate/deactivate
- `/admin/logs` — activity log
- `/admin/settings` — site settings + feature flags

### Admin CMS (Phase 7)
- `/admin/cms` — overview hub with counts per resource
- `/admin/cms/landing-builder` — drag-and-drop sections, inline content editor with `{italic:word}` markup, raw JSON mode
- `/admin/cms/banners` — upload, schedule, position, click/view tracking
- `/admin/cms/running-ads` — ticker text strip
- `/admin/cms/menus` — header/footer/mobile/sidebar nav, drag-reorder per location
- `/admin/cms/faq` — categorize, hide, edit Q&amp;A
- `/admin/cms/testimonials` — name, role, rating, content
- `/admin/cms/pages`, `/admin/cms/pages/[id]` — Markdown editor with live preview, publish toggle, SEO fields
- `/admin/cms/media` — drag-and-drop upload, folder filter, copy URL, delete

The public landing dynamically renders from `PageSection` records when present. If no sections exist, it falls back to the curated editorial composition (Hero, Catalog, Method, Stats, Bento, Voices, Notes, Partners, CTA).

The Ticker, Navbar, and Footer also pull from the CMS (running ads, header/footer menus, site settings, social links) — with sensible fallbacks when empty.

Maintenance mode redirects all non-admin traffic to a styled `/maintenance` page.

## DhruFusion integration

`src/lib/dhru-client.ts` implements the full PRD §6 contract:
- `accountinfo`, `getservices`, `getserverservices`
- `placeorder`, `getstatus`
- `placeserverorder`, `getserverstatus`

In **dev mode** (when `apiKey === 'dev-api-key-not-real'`), real network calls are
skipped — orders are mock-acknowledged and resolve to SUCCESS/REJECTED randomly
after ~90 seconds via the poller. This lets you exercise the full UI without
a live DhruFusion account.

To use a real upstream: edit the seeded provider on `/admin/providers/seed-provider-1`
and replace the API key.

## Background workers

`src/instrumentation.ts` registers two pollers (60s cadence) when
`ENABLE_BACKGROUND_JOBS=true` in `.env`:
- IMEI order poller — calls `getstatus`, maps statuses, auto-refunds REJECTED
- Server order poller — calls `getserverstatus`, captures `FILE_URL`

Disabled by default in dev to keep logs clean. Run a manual smoke test instead.

## Wallet & ledger

All wallet ops run inside Prisma `$transaction` for atomicity:
- `debitWallet()` throws `InsufficientBalanceError` if balance < amount
- `creditWallet()` for TOPUP and REFUND
- Every change writes an immutable `WalletLedger` entry with running balance

## Activity log

Every sensitive action (order create/cancel, provider CRUD, password change,
top-up approval, etc.) writes to `ActivityLog` via `logActivity()` helper.
Visible at `/admin/logs`.

## Database (PostgreSQL)

Schema memakai **PostgreSQL** (Supabase di production, Docker di lokal).

```bash
cp .env.example .env          # jika belum ada
npm run db:setup              # docker + prisma db push + seed
# atau manual:
docker compose up -d
npm run db:push && npm run db:seed
```

`DATABASE_URL` harus diawali `postgresql://` atau `postgres://` — **bukan** `file:./dev.db` (SQLite lama).

Supabase: salin connection string dari dashboard → `.env` → `npm run db:push`.

**Deploy marketing (Vercel + Supabase):** lihat [docs/DEPLOY-VERCEL-SUPABASE.md](./docs/DEPLOY-VERCEL-SUPABASE.md).

## Design system

The look is intentionally not generic-SaaS:
- Warm paper background (`#fbfaf6`), deep navy ink, electric blue accent
- Mixed display sans (Plus Jakarta) + serif italic (Instrument Serif) +
  mono (JetBrains) for codes and timestamps
- Editorial section markers (`§ 01`, `§ 02`)
- Hairline dividers and ledger-style tables instead of card grids
- Sparing animation that always communicates state (counters, scan lines,
  progress, status pings)

See `src/components/landing/` for the home page composition.
