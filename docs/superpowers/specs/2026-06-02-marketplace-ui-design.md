# Marketplace UI — Design Spec (Sub-project 1)

Date: 2026-06-02
Status: Approved for implementation

## Goal

A product-style marketplace built from **Group Services**, shown on the **public site** and linked from the **user dashboard**. Each group renders as a product card (photo, title, price-from, service count). Opening a group shows its active services (price, description, required input badges). Ordering a service opens a modal with dynamic input fields (SN / IMEI / etc., per service).

Order behaviour for this sub-project:
- **Logged-in users** order through the existing wallet-based order APIs.
- **Guests** are routed to login (interim). Guest pay-per-order via payment gateway is a separate sub-project (Sub-project 2) and is intentionally out of scope here. The modal's order entry point is structured so it can later swap guest behaviour to a checkout flow.

## Data sources

Two existing models feed the marketplace; neither currently has image/featured metadata:
- `ImeiServiceGroup` → cards of `kind = imei`
- `ServerServiceBox` → cards of `kind = server`

Per card we compute `serviceCount` (ACTIVE services) and `priceFrom` (cheapest active service). Groups with zero active services are hidden from the storefront.

## Schema changes (additive, nullable — safe `prisma db push`)

- `ImeiServiceGroup`: add `imageUrl String?`, `featured Boolean @default(false)`
- `ServerServiceBox`: add `imageUrl String?`, `description String? @db.Text`, `featured Boolean @default(false)`

## Routes

- `/marketplace` — storefront. Optional "Featured" carousel (reuse Embla like `BannerSlider`) for `featured = true` groups, plus a responsive card grid. Public; also linked from the user dashboard sidebar (same page, no duplication).
- `/marketplace/[kind]/[id]` — group detail. `kind ∈ { imei, server }`. Server Component fetches the group + active services. Lists services with price, description, and input-requirement badges. Each service opens the order modal.

## Admin changes

`GroupServicesManager` + the groups / server-boxes APIs gain:
- Photo upload (reuse `POST /api/admin/cms/media/upload`, folder `marketplace`; served via `/api/uploads/...`).
- Description field for server boxes (IMEI groups already have one).
- `featured` toggle.

Validation schemas (`createImeiServiceGroupSchema` / update, and the inline server-box zod schemas) extended with `imageUrl`, `featured`, and (server box) `description`.

## Order modal (shared logic)

To avoid duplication, extract the field-rendering + submit logic currently inside `ImeiOrderForm` / `ServerOrderForm` into shared pieces reused by both the existing order pages and the new modal:
- IMEI inputs derive from boolean `requires*` flags.
- Server inputs derive from `requiredFields` parsed via `@/lib/server-fields`.
- Submit calls the existing APIs (`POST /api/imei/orders`, `POST /api/imei/server-orders`); IMEI keeps the duplicate-check pre-flight.
- On success, redirect to `/user/orders/...`.
- Not logged in → show a "Sign in to order" CTA linking to `/login` with a callback back to the marketplace.

## Presentation / edge cases

- Missing `imageUrl` → graceful fallback (gradient + title initials), so the storefront looks complete without photos.
- Prices shown via `formatUSD`; the final charge is still resolved server-side (tiered pricing) by the order APIs — the marketplace only displays retail `priceFrom`.
- Demo mode (if enabled) blocks mutations at the middleware layer; browsing remains fully functional.

## Navigation

- Public navbar: add a "Marketplace" entry (fallback list; CMS menu still overrides when configured).
- User dashboard sidebar: add "Marketplace" linking to `/marketplace`.
