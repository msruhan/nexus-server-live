# Technical Design Document — Landing Builder Style & Variants (Level 1)

## Overview

This design enriches the existing CMS landing builder so resellers can produce visually distinct landing pages from the same section types. It adds three capabilities — a per-section style panel, layout variants per section type, and multiple instances of a section type — built entirely on the existing `PageSection` model and the existing admin CMS endpoints.

The design is deliberately **additive and isolated**: it reuses the already-present (but unused) `PageSection.settings` JSON column, reuses the existing `PUT /api/admin/cms/sections/{id}` endpoint, and touches only CMS rendering + CMS admin UI. It does not modify the database structure and does not touch the API Management system in any way.

Requirements coverage: per-section style panel (R1, R2, R4), backward compatibility (R3, R6), layout variants (R5, R6), multiple instances (R7), HTML sanitization (R8), permission gating (R9), API-Management isolation (R10), and validation (R11).

## Grounding: What Already Exists

Verified from the current codebase:

- **`PageSection` model**: `{ id, pageSlug, sectionType, title, subtitle, content (String JSON, default "{}"), settings (String JSON, default "{}"), isVisible, sortOrder }`. The `settings` column exists and is currently **unused**.
- **`PUT /api/admin/cms/sections/{id}`** already accepts and JSON-serializes both `content` and `settings` (zod `.strict()` schema with `settings: z.unknown().optional()`). It is guarded by `requireAdmin()`.
- **`POST /api/admin/cms/sections`** creates a new row per call with no per-type uniqueness constraint — so **multiple instances of the same type already work at the data layer**; this feature mostly adds UI affordance + render isolation guarantees.
- **`SectionRenderer.tsx`** (server component) parses `content` JSON and maps `sectionType` → component, rendering `Dynamic*` components when content is non-empty and hardcoded defaults otherwise. It already keys each section by `id` (render isolation already correct).
- **Hero `visualVariant`** is stored inside `content` (`ticket | console | dashboard | phone`) and consumed by `DynamicHero`.
- **`CustomHtmlSection`** currently renders `dangerouslySetInnerHTML={{ __html: html }}` with **no sanitizer** — this is the one genuine new security work item.
- **`markdown.ts`** has an `escapeHtml` helper and a self-contained renderer (no external deps).
- The builder UI (`LandingBuilder.tsx` + `SectionEditor.tsx`) already has: drag reorder, per-section edit drawer, add-section modal, live preview iframe, device toggle. The editor drawer is where the Style Panel and Variant Picker will live.

## Architecture

### Architecture Overview

```
ADMIN (editCms)                          PUBLIC SITE
─────────────                            ───────────
/admin/cms/landing-builder               SectionRenderer.tsx (server)
  ├─ SectionEditor (drawer)                ├─ resolveSectionSettings(settings)  ← NEW
  │   ├─ Content fields (existing)         ├─ SectionFrame wrapper              ← NEW
  │   ├─ Variant Picker      ← NEW         │    (bg/padding/align/width/divider)
  │   └─ Style Panel         ← NEW         └─ variant-aware Dynamic* components ← EXTENDED
  └─ preview iframe (existing)

        │  PUT /api/admin/cms/sections/{id}  (EXISTING — reused)
        │     body: { content, settings }
        ▼
  PageSection.settings  ←─ JSON: { style:{...}, variant:"..." }   (REUSED COLUMN)

NEW SHARED LIB
  src/lib/cms-style.ts      → Style schema, defaults, resolver, variant catalog
  src/lib/sanitize-html.ts  → server-side HTML allow-list sanitizer
```

Data flow: the Style Panel + Variant Picker write into the section's `settings` JSON via the existing PUT endpoint. The public `SectionRenderer` reads `settings`, resolves it against a schema with safe defaults, wraps each section in a `SectionFrame` that applies background/padding/alignment/width/dividers, and passes the resolved `variant` to the section component.

## Data Models

**No schema migration.** All new data lives inside the existing `PageSection.settings` JSON string.

### Settings JSON shape

```ts
// Stored (serialized) in PageSection.settings
type SectionSettings = {
  style?: {
    background?: 'paper' | 'ink' | 'primary' | 'gradient' | 'image'; // default 'paper'
    padding?: 'compact' | 'normal' | 'spacious';                     // default 'normal'
    align?: 'left' | 'center';                                       // default 'left'
    width?: 'narrow' | 'wide' | 'full';                              // default 'wide'
    dividerTop?: 'none' | 'line';                                    // default 'none'
    dividerBottom?: 'none' | 'line';                                 // default 'none'
    bgImageUrl?: string;        // only when background === 'image'
    bgOverlay?: number;         // 0..100 integer, default 0
  };
  variant?: string;            // layout variant id for this section type
};
```

Backward compatibility: an empty `settings` (`{}`) resolves to all defaults, which reproduce the current appearance (R3). The hero's existing `visualVariant` stays in `content` for backward compatibility; the new generic `variant` in `settings` takes precedence when present, falling back to `content.visualVariant`, then to the default (R6.3).

## Components and Interfaces

### Component 1: `src/lib/cms-style.ts` (NEW — shared, no deps)

Single source of truth for the style schema, defaults, validation, the variant catalog per section type, and the Tailwind class resolver. Imported by both the admin UI and the server renderer.

```ts
export type SectionBackground = 'paper' | 'ink' | 'primary' | 'gradient' | 'image';
export type SectionPadding = 'compact' | 'normal' | 'spacious';
export type SectionAlign = 'left' | 'center';
export type SectionWidth = 'narrow' | 'wide' | 'full';
export type SectionDivider = 'none' | 'line';

export type SectionStyle = {
  background: SectionBackground;
  padding: SectionPadding;
  align: SectionAlign;
  width: SectionWidth;
  dividerTop: SectionDivider;
  dividerBottom: SectionDivider;
  bgImageUrl: string | null;
  bgOverlay: number; // 0..100
};

export const DEFAULT_STYLE: SectionStyle = {
  background: 'paper', padding: 'normal', align: 'left',
  width: 'wide', dividerTop: 'none', dividerBottom: 'none',
  bgImageUrl: null, bgOverlay: 0,
};

// Per-type variant catalog. Default variant is index 0 and reproduces
// the current appearance.
export const VARIANTS: Record<string, { id: string; label: string }[]> = {
  hero:     [{id:'ticket'},{id:'console'},{id:'dashboard'},{id:'phone'},{id:'split-image'},{id:'minimal-center'}],
  features: [{id:'bento'},{id:'three-col'},{id:'four-col'},{id:'numbered-list'},{id:'icon-left'}],
  stats:    [{id:'horizontal'},{id:'grid'},{id:'big-number'}],
  cta:      [{id:'banner'},{id:'boxed'},{id:'split'}],
};

export function defaultVariant(sectionType: string): string | null;
export function isValidVariant(sectionType: string, variant: string): boolean;

// Parse + clamp stored settings to a safe, fully-populated object.
// Never throws; unknown/out-of-range values fall back to defaults (R3.4, R11).
export function resolveSettings(raw: unknown): { style: SectionStyle; variant: string | null };

// Zod schema used by the API for validation (R11).
export const sectionSettingsSchema; // z object, strict, opacity .int().min(0).max(100)

// Tailwind class helpers consumed by SectionFrame.
export function backgroundClasses(s: SectionStyle): { wrapper: string; isDark: boolean };
export function paddingClasses(p: SectionPadding): string;
export function widthClasses(w: SectionWidth): string;   // narrow=max-w-3xl, wide=max-w-[1400px], full=max-w-none
export function alignClasses(a: SectionAlign): string;
```

URL safety helper (used for `bgImageUrl`, R8.2):
```ts
export function safeUrl(url: string | null | undefined): string | null;
// returns url only if scheme is http/https or path starts with '/', else null
```

### Component 2: `src/lib/sanitize-html.ts` (NEW — server-side sanitizer)

A dependency-free, allow-list HTML sanitizer for the `custom_html` section (R8). Runs on the server before markup reaches the client.

```ts
const ALLOWED_TAGS = new Set([
  'p','br','strong','b','em','i','u','s','ul','ol','li','a',
  'h1','h2','h3','h4','h5','h6','blockquote','img','span','div',
  'hr','code','pre','table','thead','tbody','tr','td','th',
]);
const ALLOWED_ATTRS: Record<string,Set<string>> = {
  a: new Set(['href','title','target','rel']),
  img: new Set(['src','alt','title','width','height']),
  '*': new Set(['class']),
};
const REMOVE_TAGS = new Set(['script','iframe','object','embed','style','form','link','meta']);

export function sanitizeHtml(html: string): string;
// - removes REMOVE_TAGS and their content
// - drops any attribute starting with 'on'
// - drops href/src using javascript:/vbscript:/data: schemes (allows http/https/relative/mailto/tel)
// - strips tags not in ALLOWED_TAGS but keeps their inner text
```

Implementation approach: a small tokenizing pass over the HTML string (regex-based tag scan, same spirit as the existing `markdown.ts`), since there is no DOM on the server and we avoid adding `dompurify` + `jsdom`. This is sufficient because the input surface is a single admin-only textarea and the allow-list is conservative.

> Decision: no new dependency. If future requirements demand full HTML5 parsing fidelity, swap the internals of `sanitizeHtml` for `dompurify`+`jsdom` without changing its signature.

### Component 3: `SectionFrame` (NEW — `src/components/landing/SectionFrame.tsx`)

A server component wrapper that applies the resolved style to any section's output. The renderer wraps each section in it.

```tsx
export function SectionFrame({
  style, children,
}: { style: SectionStyle; children: React.ReactNode }) {
  // <section> with background treatment + optional bg image + overlay,
  //   top/bottom divider lines, vertical padding;
  // inner <div> with max-width + center alignment.
  // When background is 'image': absolutely-positioned <img> + overlay div
  //   (opacity = bgOverlay/100) below the content layer (R4.6).
}
```

Key detail: when `background` is `ink`/`primary`/`gradient`/`image` (dark), the frame sets a `data-dark` / passes an `isDark` context so text-on-dark remains legible. Section components already use token-based colors; the frame adds a dark-scope class (e.g. `[&_*]` overrides are avoided — instead a `cms-on-dark` utility class toggles ink/paper swaps via CSS variables).

### Component 4: `SectionRenderer.tsx` (EXTENDED)

Current behavior preserved. Changes:
1. Parse `settings` (in addition to `content`) per section.
2. Resolve via `resolveSettings(settings)`.
3. Wrap each rendered node in `<SectionFrame style={style}>`.
4. Pass `variant` into the section component (Hero/Features/Stats/CTA).
5. For `custom_html`, pass `sanitizeHtml(content.html)` instead of raw HTML.

Backward compatibility: when `settings` is `{}`, `resolveSettings` returns `DEFAULT_STYLE` + `variant=null`; `SectionFrame` with defaults renders padding/width identical to today's sections. Sections that are full-bleed today (e.g. hero) map to `width:'full'` default override per-type (see "Per-type default width" below).

### Component 5: Variant-aware section components (EXTENDED)

Each variant-bearing section gets a thin switch on `variant`, defaulting to its current markup:

- **`DynamicHero`** — already switches on `content.visualVariant`. Extend to read the resolved `variant` first; add two new right-column visuals (`split-image`, `minimal-center` changes layout, not just the visual card). `ticket` remains default (R6.3).
- **`DynamicFeatures`** — add `three-col | four-col | numbered-list | icon-left`; `bento` stays default.
- **`DynamicStats`** — add `grid | big-number`; `horizontal` stays default.
- **`DynamicCta`** — add `boxed | split`; `banner` stays default.

Each component imports `VARIANTS`/`defaultVariant` only for typing; the renderer passes the already-validated variant string.

### Component 6: Admin UI — Style Panel + Variant Picker (EXTENDED `SectionEditor.tsx`)

The editor drawer gains two collapsible groups above the existing content fields:

- **Variant Picker**: shown only for section types present in `VARIANTS`. A visual grid of variant chips (reusing the existing `HeroVisualPicker` pattern/thumbnails). Selecting updates local state; saved into `settings.variant`.
- **Style Panel**: segmented controls for background / padding / align / width / dividers; conditional `bgImageUrl` text field + `bgOverlay` range (0–100) when background = `image`. URL field validated with `safeUrl` on blur (R1.9).

Both write into a new `settings` state object. On Save, the editor sends `{ content, settings }` to the existing `PUT /api/admin/cms/sections/{id}` (one request). Live preview refreshes via the existing `refreshPreview()` iframe reload (satisfies R1.8 / R5.5 "within 1s" — the iframe reload is the existing mechanism).

### Component 7: API validation (EXTENDED `PUT /api/admin/cms/sections/{id}`)

Replace `settings: z.unknown().optional()` with a strict validation using `sectionSettingsSchema` from `cms-style.ts` (R11). On invalid payload → 400, no persistence. Variant validity is checked against the section's `sectionType` (R11.5/R11.6) by loading the row first (or validating against the union of all variant ids and re-checking per-type). `requireAdmin()` gating stays (R9).

> Note: `requireAdmin()` currently authorizes ADMIN and SUB_ADMIN. Per R9.2, the landing builder pages are already gated by the `editCms` route-permission in the admin layout, so sub-admins without `editCms` never reach these endpoints through the UI. The API remains admin/sub-admin gated; the page-level `editCms` check is the functional gate (consistent with the rest of CMS).

## Per-type default width (backward compatibility detail)

Today some sections are full-bleed (hero, partners, banner_slider) and others are constrained. To render identically when `settings` is empty, `resolveSettings` accepts an optional `sectionType` and chooses the per-type default width:

```ts
const DEFAULT_WIDTH_BY_TYPE: Record<string, SectionWidth> = {
  hero: 'full', partners: 'full', banner_slider: 'full',
  running_ads: 'full', method: 'wide', /* ...others 'wide' */
};
```

This guarantees R3.3 (identical pre-feature appearance) without storing anything.

## Error Handling

| Case | Handling | Requirement |
|------|----------|-------------|
| `settings` not valid JSON | `resolveSettings` catches, returns defaults | R2.5, R3 |
| Style value outside schema | clamp to default per key | R3.4, R4.9 |
| `background:image` but no URL | fall back to `ink` background, no empty layers | R4.8 |
| Unsafe `bgImageUrl` scheme | `safeUrl` returns null → treated as no image | R8.2 |
| Invalid variant for type | renderer falls back to default variant | R6.4 |
| API: invalid settings payload | 400, not persisted, prior settings retained | R11.2 |
| API: opacity out of 0–100 / non-int | 400, not persisted | R11.4 |
| Custom HTML with scripts | sanitized server-side before render | R8 |
| Per-type instance > 20 | API rejects add, page unchanged | R7.5 |

## Security Considerations

1. **XSS via custom_html** — the primary risk. `sanitizeHtml` runs server-side in `SectionRenderer` before `dangerouslySetInnerHTML`. Allow-list based; strips `script/iframe/style/form/...`, `on*` attributes, and dangerous URL schemes.
2. **SSRF / dangerous URLs in `bgImageUrl`** — `safeUrl` restricts to http/https/relative.
3. **Authorization** — unchanged: admin layout enforces `editCms`; API enforces `requireAdmin()`.
4. **No new attack surface on order/API-key paths** — feature is CMS-only.

## Isolation Guarantees (API Management untouched)

Files this feature will create or modify:
- CREATE: `src/lib/cms-style.ts`, `src/lib/sanitize-html.ts`, `src/components/landing/SectionFrame.tsx`
- MODIFY: `src/components/landing/SectionRenderer.tsx`, `src/components/landing/sections/Dynamic{Hero,Features,Stats,Cta}.tsx`, `src/components/landing/sections/CustomHtmlSection.tsx`, `src/app/admin/cms/landing-builder/SectionEditor.tsx`, `src/app/admin/cms/landing-builder/LandingBuilder.tsx` (add-instance UX), `src/app/api/admin/cms/sections/[id]/route.ts` (validation), optionally `src/app/api/admin/cms/sections/route.ts` (per-type limit).

Files this feature will NOT touch (explicit): `/api/index.php`, `/api/public/v1/*`, `api-key-auth.ts`, `api-auth.ts`, `dhru-fusion.ts`, `imei-order-worker.ts`, `server-order-worker.ts`, `imei-order-scheduler.ts`, `server-order-scheduler.ts`, `instrumentation*.ts`, wallet/order/payment libs. No Prisma schema change.

## Correctness Properties

These invariants must hold for the feature to be correct and safe.

### Property 1: Backward-compat identity
For any section with `settings === "{}"`, the rendered DOM is visually identical to the pre-feature output. Guaranteed by per-type default width + default style mapping to current spacing/width.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: Total resolver
`resolveSettings(raw)` never throws and always returns a fully-populated `SectionStyle` plus `variant: string | null`, for any input (valid, empty, malformed, or out-of-range).

**Validates: Requirements 2.5, 3.4, 11.1**

### Property 3: Variant safety
The renderer only ever renders a variant that is valid for the section type; any invalid or absent variant resolves to that type's default variant.

**Validates: Requirements 6.2, 6.4**

### Property 4: Sanitization soundness
After `sanitizeHtml`, the output contains no `script/iframe/object/embed/style/form` elements, no `on*` attributes, and no `javascript:`/`vbscript:` URLs — for any input string.

**Validates: Requirements 8.1, 8.3, 8.5**

### Property 5: URL safety
`safeUrl` returns non-null only for http/https/site-relative URLs.

**Validates: Requirements 8.2**

### Property 6: Persistence validity
The API persists `settings` only when the full payload validates against `sectionSettingsSchema`; otherwise prior settings are retained unchanged.

**Validates: Requirements 11.2, 11.4, 11.6**

### Property 7: Instance isolation
Editing, reordering, hiding, or deleting one `PageSection` row affects only that `id`; sibling instances of the same type are unchanged.

**Validates: Requirements 7.2, 7.3, 7.4**

### Property 8: API-Management isolation
No file outside CMS rendering + CMS admin endpoints is modified, and no Prisma schema change occurs.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

## Testing Strategy

1. **Backward compatibility (highest priority)**: render the seeded default home page with empty `settings` and confirm DOM output is visually unchanged (manual visual + the existing preview route). Verify build + `tsc`.
2. **Style resolver unit checks**: `resolveSettings` returns defaults for `{}`, garbage JSON, out-of-range opacity, unknown enum values.
3. **Sanitizer checks**: inputs containing `<script>`, `onerror=`, `javascript:` URLs, `<iframe>` are stripped; allow-listed formatting preserved.
4. **API validation**: invalid background value, opacity 150, unknown variant for type → 400, not persisted.
5. **Variant rendering**: each variant renders without horizontal overflow at 320–767px (preview mobile device).
6. **Multiple instances**: add two heroes with different variants; edit one, confirm the other is unchanged.
7. **Isolation smoke test**: confirm `/api/index.php`, `/api/public/v1/*`, order placement, and API-key auth still work after changes (build output shows routes; place a test order in dev).

## Implementation Phases (suggested task ordering)

1. `cms-style.ts` (schema, defaults, resolver, variant catalog, class helpers, `safeUrl`).
2. `sanitize-html.ts` + wire into `CustomHtmlSection` via renderer.
3. `SectionFrame.tsx` + integrate into `SectionRenderer` (style application) — verify backward compat.
4. Variant switches in `DynamicHero/Features/Stats/Cta` (default = current look).
5. API validation in `PUT .../sections/{id}` + per-type limit in POST.
6. Admin UI: Variant Picker + Style Panel in `SectionEditor`; add-instance affordance.
7. Verify: `tsc`, `next build`, preview render, mobile overflow, isolation smoke test.
