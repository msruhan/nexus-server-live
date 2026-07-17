# Service Details Modal Design

Date: 2026-07-17
Repo: `NexusServer`
Status: Draft approved in chat (option A), written for commit/deploy

## Summary

Expose admin-authored service `description` (rich HTML) to customers through a **Details** control on:

1. User dashboard service lists (`/user/services/imei`, `/user/services/server`)
2. Public Instant Order / marketplace service lists (`/marketplace/[kind]/[id]`)
3. Public catalog tables that reuse the same table component (`/services/imei`, `/services/server`)

Clicking Details opens a shared modal that shows title, group, price, delivery time, and sanitized description HTML.

## Goals

- Let customers read the same description admins enter in the service editor.
- Keep the browse/order flow intact (Order remains the primary CTA).
- Reuse one modal across user dashboard and public Instant Order surfaces.
- Render rich text safely via existing HTML sanitization.

## Non-Goals

- No redesign of Order modal to also embed description.
- No new API endpoints.
- No schema changes; `description` already exists on IMEI and Server services.
- No change to admin edit/create flows.

## Product Decision Locked In

**Option A:** Details button opens a dedicated modal with the service description. Description is not added to the Order modal in this pass.

## Surfaces

| Surface | Component | Control |
|---------|-----------|---------|
| User IMEI / Server lists | `PublicServicesTable` | Text link + Info icon next to Order |
| Public catalog IMEI / Server | `PublicServicesTable` | same |
| Marketplace Instant Order detail | `MarketplaceServices` | Details pill button + Info icon next to Order |

## Shared Modal

`src/components/services/ServiceDetailsModal.tsx`

Props:

- `title`
- `groupTitle` (optional)
- `priceLabel`
- `deliveryTime` (optional)
- `description` (optional HTML)
- `kindLabel` (e.g. `IMEI service` / `Server service`)

Behavior:

- Backdrop click and close button dismiss the modal.
- Non-empty description is rendered with `sanitizeHtml`.
- Empty description shows a short empty-state message.

## Data Flow

1. List pages already query `description` (or were updated to select/pass it).
2. Row data includes `description` alongside title, price, delivery, group.
3. Details click maps the row into `ServiceDetails` and opens the modal.
4. Order flow stays independent (`Link` or `OrderModal`).

## Implementation Status

Already present in the local working tree:

- `src/components/services/ServiceDetailsModal.tsx` (new)
- `src/app/(public)/services/components/PublicServicesTable.tsx` (Details + modal)
- `src/components/marketplace/MarketplaceServices.tsx` (Details + modal)
- `src/app/user/services/imei/page.tsx` / `server/page.tsx` (pass `description`)
- `src/app/(public)/marketplace/[kind]/[id]/page.tsx` (pass `description` into rows)
- Public catalog pages already select/pass `description`

No further UI implementation is required for option A beyond commit and deploy.

## Testing

1. Open `/user/services/imei`, click Details on a service with description — modal shows sanitized HTML.
2. Same for `/user/services/server`.
3. Open marketplace Instant Order group page, click Details — modal shows description.
4. Service without description shows empty-state copy.
5. Order still works independently after closing Details.

## Deploy Notes

After commit on `nexusserver`, follow nexus-deploy:

1. Push upstream
2. Cherry-pick to `nexus-demo` if demo should show it
3. Cherry-pick + tag on `nexus-server-live` for customer VPS / GHCR
