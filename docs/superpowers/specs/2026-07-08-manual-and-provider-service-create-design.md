# Manual And Provider Service Create Design

Date: 2026-07-08
Repo: `NexusServer`
Status: Draft approved in chat, written for implementation planning

## Summary

Add a `New Service` flow for both IMEI and Server catalogs so admins can create:

1. provider-linked services that stay connected to an upstream API provider via stored `apiId` + `toolId/serviceID`, and
2. manual services that are listed publicly but processed by admins without forwarding orders to the provider API.

The UI should reuse the current edit fields as much as possible, while adding a mode switch:

- `Sync with provider`
- `Manual service`

For provider-linked services, the source picker should default to previously synced provider catalog data and also offer a `Refresh from provider` action. For manual services, an internal reference should be auto-generated:

- `MAN-IMEI-0001`
- `MAN-SRV-0001`

## Goals

- Let admins create IMEI and Server services manually from the admin panel.
- Let admins create provider-linked services from a provider picker instead of only relying on bulk sync/import.
- Preserve provider linkage through stored `apiId` and `toolId/serviceID` so orders can still be sent upstream.
- Keep manual services in the same catalog and order flow as existing services.
- Route manual-service orders into normal order tables with a manual-review path instead of upstream API submission.

## Non-Goals

- No separate manual-order subsystem or separate manual-service tables.
- No redesign of the existing service edit experience beyond adding a creation flow and source metadata.
- No automatic overwrite of existing local services when refreshing provider catalog options in the create modal.
- No Discord/Telegram notification changes as part of this feature.

## Product Decisions Locked In

### Service modes

Each service has an explicit source mode:

- `PROVIDER_SYNCED`
- `MANUAL`

### Manual order behavior

Manual services use the same order tables and checkout flow as current services. When an order is placed for a manual service, the system should not attempt upstream API submission. Instead, the order remains in the normal flow and waits for admin action under a pending manual review state.

### Provider source picker

The provider service picker should:

- default to catalog data already stored from previous sync/import,
- allow choosing from that cached list immediately,
- offer `Refresh from provider` to fetch current upstream options on demand.

Refreshing provider options must not mutate existing active local services. It only refreshes the selection source used by the create modal.

### Editable fields for provider-linked create

When a provider service is selected, the system pre-fills local fields from upstream data. Admins may still override:

- title
- description
- retail price
- delivery time
- status
- group/box
- required fields

The provider identifier must still be stored unchanged:

- `apiId`
- `toolId/serviceID`

### Manual internal reference

Manual services should receive auto-generated internal refs:

- IMEI: `MAN-IMEI-XXXX`
- Server: `MAN-SRV-XXXX`

This is an internal management ref and should remain stable after creation.

## Data Model

### IMEI service changes

Add an explicit source field to IMEI services:

- `sourceType: 'PROVIDER_SYNCED' | 'MANUAL'`

Allow provider linkage fields to be nullable for manual services:

- `apiId: string | null`
- `toolId: string | null`

Validation rules:

- if `sourceType = PROVIDER_SYNCED`
  - `apiId` is required
  - `toolId` is required
- if `sourceType = MANUAL`
  - `apiId` must be `null`
  - `toolId` must be `null`

### Server service changes

Mirror the same approach for Server services:

- `sourceType: 'PROVIDER_SYNCED' | 'MANUAL'`
- nullable `apiId`
- nullable `toolId`

Validation rules are identical to IMEI services.

### Ref handling

Existing provider-linked services may continue using their current tool/provider references for display. For manual services, generate an internal display ref on create:

- `MAN-IMEI-0001`, `MAN-IMEI-0002`, ...
- `MAN-SRV-0001`, `MAN-SRV-0002`, ...

The implementation may either:

- store this as `toolId` replacement only for manual rows if the column type safely supports it, or
- add a dedicated internal ref field if the existing `toolId` semantics should remain strictly provider-specific.

Implementation planning should prefer the option that minimizes regression risk in workers and sync code. If `toolId` is used as the upstream identifier in many places, a dedicated internal ref field is safer.

## Admin UI

### IMEI services page

Add a `New Service` button to `Admin > IMEI services`.

Clicking it opens a modal that mirrors the current IMEI edit modal layout as closely as possible.

Modal flow:

1. Choose source mode:
   - `Sync with provider`
   - `Manual service`
2. Show mode-specific source controls.
3. Show the existing edit-like fields below.

### Server services page

Add a `New Service` button to `Admin > Server services`.

The modal flow mirrors IMEI but uses the Server-specific fields and required-fields editor.

### Mode: Sync with provider

Show:

- provider dropdown
- provider service picker/dropdown with search
- `Refresh from provider` action

Selection source:

- load from last synced/imported provider catalog data already known to the app
- after refresh, re-query and repopulate the picker

Once the provider service is selected, prefill:

- title
- description
- delivery time
- provider ref / service identifier
- any default field requirements that can be derived

Admins may then override local-facing values before saving.

### Mode: Manual service

Show the same fields as the current edit form.

IMEI manual fields:

- title
- description
- retail price
- delivery time
- group
- status
- required flags:
  - IMEI
  - Serial number
  - ECID

Server manual fields:

- title
- description
- retail price
- delivery time
- box/group
- status
- required fields editor, same as current edit behavior

### Table presentation

Add source visibility to the list views:

- badge: `Manual`
- badge: `Provider`

Also show provider information where relevant:

- provider name for linked services
- internal ref for manual services

Edit views should show source metadata clearly:

- `Source: Manual`
- `Source: Provider · <provider name>`

## Backend APIs

### Create service API

Add create endpoints or extend current service endpoints to support mode-aware creation for:

- IMEI services
- Server services

Create payload should include:

- `sourceType`
- common service fields
- provider linkage fields when `PROVIDER_SYNCED`

Server-side validation must reject:

- manual service payloads that include `apiId` or `toolId`
- provider-linked payloads missing `apiId` or `toolId`

### Provider picker data API

Add read endpoints for create modal support:

- list providers that have synced/imported service catalogs
- list cached provider services for a selected provider

### Refresh from provider API

Add an explicit action to refresh upstream options for a selected provider. This should:

1. fetch current provider services,
2. update the cached selection source,
3. return refreshed options to the modal.

This action must not silently alter existing local services in the catalog.

## Order Routing

### Provider-linked services

Orders for provider-linked services continue to use the current worker flow. Upstream submission uses the stored provider linkage:

- `apiId`
- `toolId/serviceID`

### Manual services

Orders for manual services:

- are inserted into the normal order tables,
- deduct credit / follow normal business rules where applicable,
- do not call provider APIs,
- remain in a state visible to admins as awaiting manual review.

The worker path should branch explicitly on `sourceType` rather than infer behavior only from missing provider linkage.

## Validation And Edge Cases

### Duplicate provider linkage

If an admin attempts to create or relink a provider-linked service using an `apiId + toolId` combination that is already attached to another local service, the API should reject it or require an explicit admin resolution path. Silent duplication is not allowed.

### Provider override behavior

If a provider-linked service has local title/description overrides, those overrides must not break the provider linkage. The upstream service identity always remains the stored `toolId/serviceID`.

### Upstream deletion or missing provider item

If a provider-linked service later disappears from upstream:

- do not delete the local service automatically,
- do not break historical orders,
- mark the service as linked-but-missing if needed in future UX improvements.

This feature does not require a full missing-link UX, but implementation should not make future support harder.

### Manual service required fields

Manual service creation must still enforce valid checkout requirements:

- IMEI services must have coherent flag combinations
- Server services must have valid structured required fields

### Admin review visibility

Manual-service orders must be easy for admins to identify in existing admin order views. Implementation planning should include a visible source or review-status indicator in order detail or list views.

## Testing

Minimum coverage:

1. create IMEI manual service
2. create Server manual service
3. create IMEI provider-linked service with stored `apiId + toolId`
4. create Server provider-linked service with stored `apiId + toolId`
5. reject invalid combinations:
   - manual + provider fields present
   - provider-linked without provider fields
6. manual service gets generated internal ref
7. provider-linked service keeps upstream identifier after title override
8. worker does not submit manual-service orders upstream
9. worker still submits provider-linked orders upstream
10. refresh-provider action updates picker source without mutating existing local service rows

## Recommended Implementation Strategy

Use the existing service tables with explicit source mode instead of creating parallel manual-service tables.

Recommended architecture:

1. add explicit source metadata to service records
2. add centralized helpers for service source checks
3. build mode-aware create modal for IMEI and Server pages
4. add provider picker + cached source APIs
5. branch worker behavior by `sourceType`
6. add list badges and source visibility

This keeps the system incremental, preserves the current order model, and avoids introducing a second catalog domain.

## Open Implementation Note

Before implementation, decide whether manual internal refs should live:

- in the existing `toolId` column for manual rows, or
- in a new dedicated internal ref field.

Given current worker logic relies on `toolId` as an upstream identifier, the safer implementation is likely a dedicated internal ref field for manual rows.
