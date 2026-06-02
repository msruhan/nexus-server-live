# Implementation Plan — Landing Builder Style & Variants (Level 1)

## Overview

All work is additive and isolated to CMS rendering + CMS admin UI. No Prisma schema change. The API Management system (`/api/index.php`, `/api/public/v1/*`, `api-key-auth`, `api-auth`, `dhru-fusion`, order workers, schedulers, instrumentation) must not be modified. Tasks follow the design's phase ordering: shared lib → sanitizer → SectionFrame → renderer integration → variants → API validation → admin UI → verification.

## Tasks

- [x] 1. Create the shared style library `src/lib/cms-style.ts`
  - Define types: `SectionBackground`, `SectionPadding`, `SectionAlign`, `SectionWidth`, `SectionDivider`, `SectionStyle`
  - Define `DEFAULT_STYLE` and `DEFAULT_WIDTH_BY_TYPE` (hero/partners/banner_slider/running_ads = `full`, others = `wide`)
  - Define `VARIANTS` catalog per section type (hero, features, stats, cta) with default variant at index 0
  - Implement `defaultVariant(sectionType)` and `isValidVariant(sectionType, variant)`
  - Implement `resolveSettings(raw, sectionType?)` — total function, never throws, clamps unknown/out-of-range to defaults; returns `{ style, variant }`
  - Implement `safeUrl(url)` — allow only http/https/site-relative, else null
  - Implement Tailwind class helpers: `backgroundClasses`, `paddingClasses`, `widthClasses`, `alignClasses`
  - Export `sectionSettingsSchema` (zod, strict, opacity `.int().min(0).max(100)`)
  - _Requirements: 1.1–1.10, 2.5, 3.2, 3.4, 4.9, 5.1–5.4, 6.4, 8.2, 11.1, 11.3, 11.5_

- [x] 2. Create the server-side HTML sanitizer `src/lib/sanitize-html.ts`
  - Define `ALLOWED_TAGS`, `ALLOWED_ATTRS`, `REMOVE_TAGS` allow/deny lists
  - Implement `sanitizeHtml(html)`: remove deny-listed tags + their content, drop `on*` attributes, drop `javascript:`/`vbscript:`/`data:` URLs in href/src, strip non-allow-listed tags while keeping inner text
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [x] 2.1 Wire the sanitizer into the public render path
  - Update `CustomHtmlSection.tsx` (or call site in `SectionRenderer`) so custom HTML is passed through `sanitizeHtml` server-side before `dangerouslySetInnerHTML`
  - _Requirements: 8.1, 8.5_

- [x] 3. Create `src/components/landing/SectionFrame.tsx`
  - Server component that wraps section output: applies background (paper/ink/primary/gradient/image), vertical padding, top/bottom divider lines
  - Inner container applies max-width (narrow/wide/full) + center alignment
  - For `background:image` with valid `safeUrl`: render `<img>` background + overlay layer (opacity = `bgOverlay/100`) below content (R4.6); if no/invalid URL, fall back to `ink` background with no empty layers (R4.8)
  - Apply dark-scope class so text stays legible on dark backgrounds
  - Ensure no horizontal overflow at 320–767px for all combinations
  - _Requirements: 4.1–4.9, 6.5_

- [x] 4. Integrate style + variant resolution into `SectionRenderer.tsx`
  - Parse `settings` JSON per section (alongside existing `content`)
  - Call `resolveSettings(settings, sectionType)` to get `{ style, variant }`
  - Wrap each rendered section node in `<SectionFrame style={style}>`
  - Pass resolved `variant` into variant-bearing components (hero/features/stats/cta)
  - Preserve existing hidden-section overlay behavior
  - _Requirements: 3.1, 3.3, 4.1–4.9, 6.1, 6.2, 7.2, 7.3_

- [x] 4.1 Verify backward compatibility after SectionFrame integration
  - Run `npx tsc --noEmit` and `npx next build`
  - Render the seeded default home page (empty `settings`) via the preview route and confirm it looks unchanged
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Add layout variants to the dynamic section components
  - `DynamicHero.tsx`: read resolved `variant` first (fallback to `content.visualVariant`, then default `ticket`); add `split-image` and `minimal-center` layouts
  - `DynamicFeatures.tsx`: add `three-col`, `four-col`, `numbered-list`, `icon-left`; keep `bento` default
  - `DynamicStats.tsx`: add `grid`, `big-number`; keep `horizontal` default
  - `DynamicCta.tsx`: add `boxed`, `split`; keep `banner` default
  - Each component falls back to its default variant for unknown values
  - _Requirements: 5.1–5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Add settings validation to the section API
  - In `PUT /api/admin/cms/sections/[id]/route.ts`, validate `settings` with `sectionSettingsSchema`; reject invalid payloads with 400 and do not persist (retain prior settings)
  - Validate variant against the row's `sectionType` (reject if not defined for the type)
  - Keep `requireAdmin()` gating
  - _Requirements: 9.1, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 6.1 Enforce per-type instance limit on section creation
  - In `POST /api/admin/cms/sections/route.ts`, reject creating a section when the page already has 20 instances of that type (page unchanged, error response)
  - _Requirements: 7.1, 7.5_

- [x] 7. Add the Variant Picker to the admin Section Editor
  - In `SectionEditor.tsx`, show a visual variant grid for section types present in `VARIANTS` (reuse the `HeroVisualPicker` thumbnail pattern)
  - Store selection in a new local `settings` state; persist via the existing PUT (`{ content, settings }`)
  - Show only variants defined for the current section type
  - _Requirements: 5.1–5.7, 5.9_

- [x] 7.1 Add the Style Panel to the admin Section Editor
  - Segmented controls for background / padding / align / width / dividerTop / dividerBottom
  - Conditional `bgImageUrl` field + `bgOverlay` range (0–100) shown only when background = `image`; hidden otherwise
  - Validate `bgImageUrl` with `safeUrl` on blur; reject malformed URL with inline error and retain previous value
  - Trigger live preview refresh on change
  - _Requirements: 1.1–1.10, 2.1, 2.2, 2.4_

- [x] 7.2 Allow adding multiple instances of the same section type
  - Ensure the Add-Section modal in `LandingBuilder.tsx` always creates a new instance (no client-side dedup), respecting the API per-type limit
  - Confirm edit/hide/delete/reorder act only on the targeted instance
  - _Requirements: 7.1, 7.2, 7.4, 7.6, 7.7_

- [x] 8. Final verification and isolation smoke test
  - Run `npx tsc --noEmit` (zero errors)
  - Run `npx next build` and confirm `/api/index.php`, `/api/public/v1/*`, `/api/imei/orders`, `/api/imei/server-orders` are present in the build output (unchanged)
  - Manually test: set background=image with `javascript:` URL is rejected; custom HTML with `<script>` is stripped; two hero instances render independently; mobile preview has no horizontal overflow
  - Place a test order in dev to confirm order flow + API-key auth still work
  - _Requirements: 8.1, 8.2, 10.1, 10.2, 10.3, 10.4_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"], "rationale": "Foundation: shared style library and the independent HTML sanitizer can be built in parallel." },
    { "wave": 2, "tasks": ["2.1", "3", "6", "6.1"], "rationale": "Wire sanitizer into render path; build SectionFrame; add API validation + per-type limit — all depend only on wave 1." },
    { "wave": 3, "tasks": ["4"], "rationale": "Integrate style + variant resolution into SectionRenderer using SectionFrame and cms-style." },
    { "wave": 4, "tasks": ["4.1"], "rationale": "Verify backward compatibility before adding variant markup." },
    { "wave": 5, "tasks": ["5", "7", "7.1", "7.2"], "rationale": "Add variant markup to Dynamic components and build the admin Variant Picker, Style Panel, and multiple-instance UX." },
    { "wave": 6, "tasks": ["8"], "rationale": "Final verification + isolation smoke test after all branches complete." }
  ]
}
```

Visual summary:

```
Task 1 (cms-style.ts)
 ├─> Task 3 (SectionFrame) ──> Task 4 (SectionRenderer integration) ──> Task 4.1 (verify backward compat)
 │                                                          │
 │                                                          └─> Task 5 (variants in Dynamic components)
 ├─> Task 6 (API settings validation) ──> Task 6.1 (per-type instance limit)
 └─> Task 7 (Variant Picker) ──> Task 7.1 (Style Panel) ──> Task 7.2 (multiple instances UX)

Task 2 (sanitize-html.ts) ──> Task 2.1 (wire into render path)

All branches ──> Task 8 (final verification + isolation smoke test)
```

Notes on ordering:
- Task 1 is the foundation; Tasks 3, 5, 6, 7 all depend on it.
- Task 2 / 2.1 (sanitizer) is independent and can be done in parallel with Task 1.
- Task 4.1 (backward-compat verification) gates progression to the variant work.
- Task 8 runs last, after every branch is complete.

## Notes

- Reuse the existing `PUT /api/admin/cms/sections/{id}` endpoint (already accepts `settings`); do not create new endpoints for persistence.
- Hero's existing `content.visualVariant` must keep working; resolved `settings.variant` takes precedence when present.
- Empty `settings` (`{}`) must resolve to defaults that reproduce current appearance — verify in Task 4.1 before adding variants.
- Sanitization runs server-side only; never trust client-sanitized HTML.
- Keep `requireAdmin()` on the API; page-level `editCms` permission remains the functional gate.

