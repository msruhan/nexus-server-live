# Service Editor Group And Delivery Design

Date: 2026-07-17
Repo: `NexusServer`
Status: Draft approved in chat, written for implementation planning

## Summary

Add the missing `group/box` selector and `delivery time` field to both admin edit dialogs:

1. `Admin > IMEI services > Edit`
2. `Admin > Server services > Edit`

The create dialogs already support these fields and the update APIs already accept them. This change only closes the UX gap so admins can update service placement and delivery estimates after creation.

## Goals

- Let admins change IMEI service group from the edit dialog.
- Let admins change Server service box/group from the edit dialog.
- Let admins update delivery time from both edit dialogs.
- Keep the edit experience aligned with the create dialogs.
- Reuse existing API validation and save flow.

## Non-Goals

- No backend schema changes.
- No new API endpoints.
- No redesign of the overall service editor layouts.
- No changes to create dialogs beyond keeping visual consistency.
- No notification behavior changes as part of this work.

## Current State

### IMEI editor

The IMEI create dialog already supports:

- `groupId`
- `deliveryTime`

The IMEI edit dialog currently supports:

- title
- description
- price
- required-field flags

Missing fields in edit:

- `groupId`
- `deliveryTime`

### Server editor

The Server create dialog already supports:

- `boxId`
- `deliveryTime`

The Server edit dialog currently supports:

- title
- description
- price
- required fields editor

Missing fields in edit:

- `boxId`
- `deliveryTime`

### Backend support

No API expansion is required:

- `updateImeiServiceSchema` already accepts `groupId` and `deliveryTime`
- `updateServerServiceSchema` already accepts `boxId` and `deliveryTime`

The current PATCH routes already pass parsed update payloads into Prisma updates.

## Product Decisions Locked In

### Scope

Apply the change to both edit dialogs:

- IMEI services
- Server services

### Field placement

Place the new controls in the right-side column of each modal, above `Retail price`, to match the structure already used in the create dialogs.

### Field behavior

#### IMEI edit dialog

Add:

- `Group` select bound to `groupId`
- `Delivery time` text input bound to `deliveryTime`

#### Server edit dialog

Add:

- `Group` or `Box` select bound to `boxId`
- `Delivery time` text input bound to `deliveryTime`

The label may stay aligned with the existing page vocabulary:

- IMEI: `Group`
- Server: `Group` or `Box`

Implementation should prefer whatever matches current table/page language to avoid mixed terminology in one screen.

### Initial values

Each edit dialog should prefill from the row being edited:

- selected group/box from the row id field
- delivery time from the row delivery field, normalized back to empty string when the table shows `—`

### Save behavior

On save, the edit dialog should include the new fields in the existing PATCH payload:

- IMEI: `groupId`, `deliveryTime`
- Server: `boxId`, `deliveryTime`

No changes are required to the success flow:

- show existing success toast
- refresh router data
- close modal using current behavior

## UI Design

### IMEI edit dialog

The right column should contain, in order:

1. `Group` select
2. `Retail price`
3. `Delivery time`
4. required field flags
5. save button

The new group selector should use the same option source already passed into the page for filtering and create flow.

### Server edit dialog

The right column should contain, in order:

1. `Group`/`Box` select
2. `Retail price`
3. `Delivery time`
4. required fields editor
5. save button

This preserves the current mental model while adding only the missing editable fields.

## Data Flow

### IMEI

1. User opens edit modal for an IMEI service.
2. Modal initializes local state from the selected row:
   - `groupId`
   - `deliveryTime`
3. User changes one or both values.
4. Save sends PATCH payload to `/api/admin/imei/services/:id`.
5. Existing route validation accepts the fields and updates Prisma.
6. Page refresh reflects the new group and delivery time.

### Server

1. User opens edit modal for a Server service.
2. Modal initializes local state from the selected row:
   - `boxId`
   - `deliveryTime`
3. User changes one or both values.
4. Save sends PATCH payload to `/api/admin/imei/server-services/:id`.
5. Existing route validation accepts the fields and updates Prisma.
6. Page refresh reflects the new group/box and delivery time.

## Edge Cases

### Placeholder delivery values

Table rows may show `—` for missing delivery time. The edit form should not send `—` back as actual data. It should normalize display placeholders to:

- empty string in local form state
- `null` in PATCH payload when left blank

### Group selection validity

If a row references a group/box that is not present in the currently loaded options, the dialog should still remain usable. Preferred handling:

- initialize to the row value if present
- otherwise fall back to the first available option only if the saved value is truly unavailable

Implementation should avoid silently changing group on open unless there is no valid matching option.

### Notification side effects

Changing group visibility can affect whether future price/status updates trigger Telegram or Discord posts, because notification logic checks public visibility on the associated group/box. This feature does not add notification changes, but implementation should preserve the current route behavior and avoid accidental edits on open.

## Testing

Minimum verification:

1. Edit an IMEI service and change only `deliveryTime`.
2. Edit an IMEI service and change only `groupId`.
3. Edit an IMEI service and clear `deliveryTime`.
4. Edit a Server service and change only `deliveryTime`.
5. Edit a Server service and change only `boxId`.
6. Edit a Server service and clear `deliveryTime`.
7. Confirm table refresh shows updated group and delivery values after save.
8. Confirm existing fields still save correctly after the modal changes.

## Recommended Implementation Strategy

Use the lightest possible change:

1. extend both edit dialog components with local state for group/box and delivery time
2. render controls using the same options and styling patterns as the create dialogs
3. include fields in existing `onSave` payloads
4. manually verify both pages

This avoids unnecessary refactoring and keeps the scope tightly aligned with the user request.
