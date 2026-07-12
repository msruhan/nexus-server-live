# Flexible price group rules — design spec

**Date:** 2026-07-12  
**Status:** Draft — pending user review  
**Scope:** NexusServer admin pricing (User groups / `PriceGroup`)

## Problem

Today a user group applies one global rule (% off or ± USD) to **all** IMEI and server services. Per-service overrides exist but only as a **fixed USD price**. Catalog groups (`ImeiServiceGroup`, `ServerServiceBox`) are not part of pricing.

Admins need:

1. Optional global default (no blanket discount unless configured).
2. Rules scoped to a **catalog group** (all services in that group).
3. Rules scoped to a **single service** (can differ within the same catalog group).
4. Each scoped rule supports **%, ± USD, or absolute USD** (choice C).

## Decisions (brainstorming)

| Topic | Choice |
|--------|--------|
| Rule types at scoped levels | C — %, ± USD, and absolute USD |
| Precedence | A — service → catalog group → global default → retail |
| Global default | B — optional (`defaultEnabled`); if off, unmatched services stay retail |
| Admin UI | A — extend existing user group detail page |

## Recommended approach

**Unified `PriceGroupRule` table** (replace incremental multi-table growth). Single resolver path; clear precedence; one API/UI pattern for catalog-group and service rules.

---

## 1. Data model

### `PriceGroup` (existing, extended)

| Field | Change |
|--------|--------|
| `defaultEnabled` | **New** `Boolean @default(true)` — when `false`, skip global rule; retail for services without a more specific rule |
| `adjustmentType`, `discountPercent`, `fixedAdjustment` | Unchanged — used only when `defaultEnabled === true` |
| `isDefault`, `isActive`, `name`, `description` | Unchanged |

**Migration:** Existing groups keep `defaultEnabled = true` and current percent/fixed values (no pricing behavior change until admin edits).

### `PriceGroupRule` (new)

Replaces `ServicePriceOverride` after data migration.

| Field | Type | Notes |
|--------|------|--------|
| `id` | cuid | |
| `priceGroupId` | FK → `PriceGroup` | cascade delete |
| `scope` | `CATALOG_GROUP` \| `SERVICE` | |
| `kind` | `imei` \| `server` | |
| `imeiGroupId` | FK? → `ImeiServiceGroup` | set when `scope=CATALOG_GROUP` and `kind=imei` |
| `serverBoxId` | FK? → `ServerServiceBox` | set when `scope=CATALOG_GROUP` and `kind=server` |
| `imeiServiceId` | FK? → `ImeiService` | set when `scope=SERVICE` and `kind=imei` |
| `serverServiceId` | FK? → `ServerService` | set when `scope=SERVICE` and `kind=server` |
| `ruleType` | `PERCENT` \| `FIXED` \| `ABSOLUTE` | |
| `discountPercent` | Decimal(5,2)? | when `ruleType=PERCENT` |
| `fixedAdjustment` | Decimal(12,2)? | when `ruleType=FIXED` |
| `absolutePrice` | Decimal(12,2)? | when `ruleType=ABSOLUTE` |
| `createdAt` / `updatedAt` | | |

**Uniqueness:**

- `@@unique([priceGroupId, imeiServiceId])` (service scope, imei)
- `@@unique([priceGroupId, serverServiceId])` (service scope, server)
- `@@unique([priceGroupId, imeiGroupId])` (catalog scope, imei)
- `@@unique([priceGroupId, serverBoxId])` (catalog scope, server)

**Check constraints (app-level validation):** Exactly one target FK populated per row matching `scope` + `kind`.

### Deprecation

- Drop `ServicePriceOverride` after migrating rows to `PriceGroupRule` (`scope=SERVICE`, `ruleType=ABSOLUTE`, `absolutePrice=price`).
- Remove old override API routes after migration (or keep as thin aliases for one release — prefer clean cut in same PR).

---

## 2. Price resolution

**Single function:** `resolveServicePriceForUser` in `src/lib/pricing.ts` (keep as source of truth).

### Precedence (most specific wins)

```
1. PriceGroupRule  scope=SERVICE     (matching imeiServiceId or serverServiceId)
2. PriceGroupRule  scope=CATALOG_GROUP (service's groupId / boxId)
3. PriceGroup      defaultEnabled + adjustmentType PERCENT | FIXED
4. Retail          service.price
```

### Applying a rule

| ruleType | Formula (base = retail `service.price`) |
|----------|----------------------------------------|
| `ABSOLUTE` | `absolutePrice` (min 0.01) |
| `PERCENT` | `base × (100 − p) / 100`, round **down** to 2 dp, `p` clamped 0–50 |
| `FIXED` | `base + fixedAdjustment`, round down, floor at 0 |

Reuse existing `multiplyByPercentDown` and fixed-delta logic from current global path.

### `ResolvedPrice.source` (extended)

- `group_override` → rename conceptually to `group_rule_service` (or keep alias for API stability)
- **New:** `group_rule_catalog`
- Keep: `group_percent`, `group_fixed`, `retail`

### Performance

For order placement (hot path):

1. Load user + `priceGroup` (unchanged).
2. One query: `priceGroupRule.findFirst` for `SERVICE` + service id.
3. If miss: one query for `CATALOG_GROUP` + service's `groupId`/`boxId`.
4. Else global default if enabled.

Optional later: cache rules per `priceGroupId` in memory with short TTL — **not** in v1.

### Failure mode

On any DB/validation error → fall back to retail (existing behavior). Never block orders.

---

## 3. Admin UI

**Location:** `/admin/price-groups/[id]` — extend `GroupPricingManager` (or split into subcomponents).

### Section order (top → bottom)

1. **Global default** (existing create/edit on list page + summary on detail)
   - Toggle: **Enable default pricing for all services**
   - When on: % or ± USD (existing controls)
   - When off: copy explains only catalog/service rules apply

2. **Catalog group rules** (new)
   - Tabs: IMEI groups | Server boxes
   - Add rule: pick group → rule type (% / ± / absolute) → value
   - Table: group name, rule summary, affected service count, delete

3. **Per-service rules** (upgrade existing)
   - Add rule type selector (% / ± / absolute), not only USD field
   - Table columns: service, catalog group name, retail, rule summary, delete
   - Service picker: optional filter by catalog group

### List page (`PriceGroupsManager`)

- Show default summary: `No default · 3 catalog rules · 12 service rules` (or `10% all services` when default enabled)
- Create form: add **Enable default pricing** toggle (default on for backward UX)

### Preview (nice-to-have in v1, required in v1.1 if timeboxed)

Inline hint when editing a rule: “Example: retail $10 → **$8.50**” using live retail from selected target.

---

## 4. API

### New routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/price-groups/[id]/rules` | List all rules (optional `?scope=` filter) |
| POST | `/api/admin/price-groups/[id]/rules` | Create/update upsert by unique key |
| DELETE | `/api/admin/price-groups/[id]/rules/[ruleId]` | Remove rule |

**POST body (example):**

```json
{
  "scope": "CATALOG_GROUP",
  "kind": "imei",
  "catalogGroupId": "cuid",
  "ruleType": "PERCENT",
  "discountPercent": 15
}
```

```json
{
  "scope": "SERVICE",
  "kind": "server",
  "serviceId": "cuid",
  "ruleType": "ABSOLUTE",
  "absolutePrice": 8.5
}
```

Validation: zod schemas; reject conflicting null targets; activity log `price_group.rule_set` / `price_group.rule_removed`.

### Updated routes

- `PUT /api/admin/price-groups/[id]` — include `defaultEnabled`
- `POST /api/admin/price-groups` — include `defaultEnabled`

### Remove

- `/api/admin/price-groups/[id]/overrides/*` after migration

### Public / reseller APIs

No request shape changes. All order paths already call `resolveServicePriceForUser` — they pick up new logic automatically.

---

## 5. Migration plan

1. Add `defaultEnabled` to `PriceGroup` (default `true`).
2. Create `PriceGroupRule` table.
3. SQL/script: copy `ServicePriceOverride` → `PriceGroupRule` (SERVICE, ABSOLUTE).
4. Deploy code using new table + resolver.
5. Drop `ServicePriceOverride` model in follow-up migration (same release if safe).

**Rollback:** Keep override table read-only one release if needed; prefer single cutover for small codebase.

---

## 6. Edge cases

| Case | Behavior |
|------|----------|
| Service moved to another catalog group | Catalog-group rule follows **current** `groupId`/`boxId` at order time |
| Catalog group deleted | FK `onDelete: Cascade` removes catalog rules |
| Service deleted | Cascade removes service rules |
| `defaultEnabled=false` and no matching rule | Retail |
| Both PERCENT and ABSOLUTE on same service | Impossible — one row per service per group |
| Inactive price group | Retail (unchanged) |
| Guest / no group | Retail (unchanged) |

---

## 7. Testing

- **Unit:** `resolveServicePriceForUser` — matrix of precedence, three rule types, `defaultEnabled` on/off.
- **API:** CRUD rules, validation errors, unique constraint conflicts.
- **Migration:** seed overrides → assert equivalent prices after migration.

---

## 8. Out of scope (v1)

- Cross-group “pricing templates” copy between user groups
- Bulk CSV import
- Matrix grid UI (approach C)
- Per-user overrides (only per-group via `User.priceGroupId`)
- Historical price audit beyond existing activity log

---

## 9. Implementation order (for writing-plans)

1. Schema + migration + `price-group` helpers (`formatRule`, validation)
2. Resolver refactor in `pricing.ts`
3. Admin API routes
4. UI: detail page sections + list page summary
5. Remove legacy override paths
6. Tests
