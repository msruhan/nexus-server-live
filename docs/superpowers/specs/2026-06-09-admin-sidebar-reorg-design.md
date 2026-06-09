# Admin sidebar reorganization (A3)

## Problem

Section **People & logs** mixed 14 unrelated items (users, logs, API, email, license, backup, theme, settings).

## Decision

Option **A3**: split into focused sections; keep **Palette & theme** and **Download tools** under **Platform** (reseller one-stop for site config).

## New structure

| Section | Items |
|---------|-------|
| Operations | *(unchanged)* |
| Catalog | *(unchanged)* |
| **People & support** | Users, Sub admins, Support tickets |
| **Security & logs** | Activity log, API keys, IP management |
| **Notifications** | Email / SMTP, Telegram bot |
| **Platform** | License & Update, Database backup, Maintenance mode, Settings, Palette & theme, Download tools |
| CMS | *(unchanged)* |

## Scope

- **In:** Reorder/relabel `adminSections` in `src/components/dashboard/Sidebar.tsx`
- **Out:** Route URLs, permissions, sub-admin keys, nav badges (href keys unchanged)

## Sub-admin

Permission keys and `admin-route-permissions.ts` unchanged. Empty sections hidden automatically when sub-admin lacks all items in that section.
