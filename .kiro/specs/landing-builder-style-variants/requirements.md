# Requirements Document

## Introduction

This feature enriches the existing NexusServer CMS "Landing page builder" (at `/admin/cms/landing-builder`) so that each reseller/customer can produce visually distinct landing pages from the same set of section types, without introducing a full row/column page-building system ("Level 1" enrichment).

The feature delivers three capabilities, all built on top of the existing `PageSection` Prisma model:

1. A **per-section style panel** that uses the currently-unused `PageSection.settings` JSON column to store visual style controls (background, padding, alignment, content width, dividers, optional background image and overlay).
2. **Layout variants per section type**, extending the existing Hero `visualVariant` concept to other section types (Hero, Features, Stats, CTA), selectable per section instance.
3. **Multiple instances of the same section type** on a single page (for example, two Hero sections with different variants), removing the implicit "one hero / one stats" assumption.

The feature is intentionally scoped to the CMS/frontend. It reuses the existing `settings` and `content` JSON columns and adds no risk to order processing or the API Management system. All changes are backward compatible: existing landing pages must render identically when no new style or variant is configured.

This document defines the requirements for this feature using EARS patterns. It does not prescribe implementation; technical decisions are deferred to the design phase.

## Glossary

- **Style_Builder**: The collection of CMS admin UI and rendering logic introduced by this feature that lets an editor apply per-section visual styles, choose layout variants, and add multiple instances of a section type.
- **Style_Panel**: The admin UI control group, shown per section instance, that edits the section's visual style settings (background, padding, alignment, content width, dividers, background image, overlay).
- **Variant_Picker**: The admin UI control that lets an editor select a layout variant for the current section instance.
- **Section_Renderer**: The server-side rendering component (`src/components/landing/SectionRenderer.tsx`) that maps a stored section's type, content, and settings to a rendered React component on the public site.
- **Section_Instance**: A single row in the `PageSection` table, identified by its `id`, with a `sectionType`, `content` (JSON string), and `settings` (JSON string).
- **Section_Settings**: The parsed object stored in the `PageSection.settings` JSON column, holding the per-section visual style controls defined by this feature.
- **Layout_Variant**: A named alternative visual arrangement for a given `sectionType` (for example, Features `bento` vs `three-col`). The default variant reproduces the section's current appearance.
- **Default_Variant**: The Layout_Variant that reproduces a section type's current (pre-feature) appearance.
- **Section_Type**: One of the supported CMS section types defined in `src/lib/cms-types.ts` (hero, stats, features, service_catalog, method, testimonials, faq, banner_slider, cta, partners, running_ads, custom_html, spacer).
- **Style_Schema**: The validation schema that defines allowed keys and values for Section_Settings.
- **CMS_Editor**: An admin or sub-admin user with the `editCms` permission who uses the landing builder.
- **HTML_Sanitizer**: The component responsible for removing unsafe markup (scripts, event handlers, dangerous URLs) from editor-provided HTML before it is rendered on the public site.
- **Section_Settings_API**: The existing admin API endpoint `PUT /api/admin/cms/sections/{id}` that persists a section's `content`, `settings`, and visibility.
- **API_Management_System**: The pre-existing order-processing platform components that receive orders via API key and forward them to the supplier (Dhru). Includes `/api/index.php`, `/api/public/v1/*`, `api-key-auth`, `api-auth`, `dhru-fusion`, `imei-order-worker`, `server-order-worker`, schedulers, and instrumentation. These are off-limits for this feature.

## Requirements

### Requirement 1: Per-section visual style settings

**User Story:** As a CMS_Editor, I want to apply visual style controls to an individual section, so that I can make the same section type look different across pages without editing code.

#### Acceptance Criteria

1. THE Style_Panel SHALL expose a background style control with the selectable values paper, ink, primary, gradient, and image.
2. THE Style_Panel SHALL expose a padding control with the selectable values compact, normal, and spacious.
3. THE Style_Panel SHALL expose a content alignment control with the selectable values left and center.
4. THE Style_Panel SHALL expose a maximum content width control with the selectable values narrow, wide, and full.
5. THE Style_Panel SHALL expose a top divider control and a bottom divider control, each with the selectable values none and line.
6. WHERE the background style control is set to image, THE Style_Panel SHALL expose a background image URL field that accepts a maximum of 2,048 characters and an overlay opacity control that accepts integer percentage values from 0 to 100 inclusive and defaults to 0.
7. WHERE the background style control is set to a value other than image, THE Style_Panel SHALL hide the background image URL field and the overlay opacity control.
8. WHEN the CMS_Editor changes a control in the Style_Panel, THE Style_Builder SHALL update the live preview to reflect the new Section_Settings within 1 second of the change.
9. IF the CMS_Editor enters a value in the background image URL field that is not a well-formed URL, THEN THE Style_Builder SHALL reject the value, retain the previously saved background image URL, and display an error indication identifying the background image URL field as invalid.
10. WHEN a section is loaded with no stored value or an unrecognized value for a Style_Panel control, THE Style_Builder SHALL apply the default value of paper for background style, normal for padding, left for content alignment, wide for maximum content width, and none for both the top divider and bottom divider controls.

### Requirement 2: Persist style settings in the existing settings column

**User Story:** As a CMS_Editor, I want my style choices to be saved with the section, so that they persist across sessions and appear on the public site.

#### Acceptance Criteria

1. WHEN the CMS_Editor saves a section after editing the Style_Panel, THE Style_Builder SHALL persist the Section_Settings to the `PageSection.settings` column via the Section_Settings_API.
2. THE Style_Builder SHALL store Section_Settings as a JSON-serialized object in the existing `PageSection.settings` column.
3. THE Style_Builder SHALL NOT add, drop, or rename any column on the `PageSection` model.
4. WHEN a section is loaded into the builder, THE Style_Panel SHALL display the control values parsed from the section's stored Section_Settings.
5. IF the stored `PageSection.settings` value is empty or not valid JSON, THEN THE Style_Builder SHALL treat the Section_Settings as the default values without raising an error to the CMS_Editor.

### Requirement 3: Backward-compatible style rendering

**User Story:** As a platform owner, I want existing landing pages to render exactly as before when no style settings are present, so that upgrading to this feature changes nothing visually until an editor opts in.

#### Acceptance Criteria

1. IF a Section_Instance has empty Section_Settings, THEN THE Section_Renderer SHALL render that section with the same appearance it had before this feature.
2. THE Section_Renderer SHALL apply default Section_Settings values that reproduce the current appearance when a setting key is absent.
3. WHEN the background style is paper, the padding is normal, the content alignment is left, the maximum content width is the section's current width, and both dividers are none, THE Section_Renderer SHALL render the section identically to its pre-feature appearance.
4. IF a stored Section_Settings value falls outside the Style_Schema, THEN THE Section_Renderer SHALL fall back to the default value for that key and render the section without error.

### Requirement 4: Apply style settings on the public site

**User Story:** As a visitor, I want each section to display with the styles the editor configured, so that the page looks the way the reseller intended.

#### Acceptance Criteria

1. WHEN the background style is set to ink, primary, or gradient, THE Section_Renderer SHALL render the section with the corresponding background treatment.
2. WHEN the padding is set to compact, normal, or spacious, THE Section_Renderer SHALL render the section with the corresponding vertical spacing.
3. WHEN the content alignment is set to center, THE Section_Renderer SHALL render the section content horizontally centered.
4. WHEN the maximum content width is set to narrow, wide, or full, THE Section_Renderer SHALL constrain the section content to the corresponding width.
5. WHEN a top divider or bottom divider is set to line, THE Section_Renderer SHALL render a divider line at the corresponding edge of the section.
6. WHERE the background style is image and a background image URL is provided, THE Section_Renderer SHALL render the image as the section background with an overlay layer of the configured integer opacity (0 to 100 inclusive) placed above the image and below the content.
7. WHILE the viewport width is between 320 and 767 pixels inclusive, THE Section_Renderer SHALL render every background style, padding, alignment, content width, and divider option such that content does not extend beyond the viewport width.
8. IF the background style is image but no background image URL is provided, THEN THE Section_Renderer SHALL render the section with the default ink background and SHALL NOT render an empty image or overlay layer.
9. IF a background style, padding, alignment, or content width value is unset or outside the Style_Schema, THEN THE Section_Renderer SHALL render the section using the default value for that key (paper background, normal padding, left alignment, wide content width).

### Requirement 5: Layout variants per section type

**User Story:** As a CMS_Editor, I want to choose a layout variant for a section, so that I can change its structure beyond color and spacing.

#### Acceptance Criteria

1. THE Variant_Picker SHALL offer for the hero section type the variants ticket, console, dashboard, phone, split-image, and minimal-center.
2. THE Variant_Picker SHALL offer for the features section type the variants bento, three-col, four-col, numbered-list, and icon-left.
3. THE Variant_Picker SHALL offer for the stats section type the variants horizontal, grid, and big-number.
4. THE Variant_Picker SHALL offer for the cta section type the variants banner, boxed, and split.
5. WHEN the CMS_Editor selects a Layout_Variant in the Variant_Picker, THE Style_Builder SHALL update the live preview to render the selected variant within 1 second.
6. WHEN the CMS_Editor saves a section after selecting a Layout_Variant, THE Style_Builder SHALL persist the selected variant for that Section_Instance.
7. WHEN the CMS_Editor opens the Variant_Picker for a Section_Instance, THE Variant_Picker SHALL display only the variant choices defined for that Section_Instance's section type.
8. WHEN a Section_Instance is rendered without a previously selected Layout_Variant, THE Style_Builder SHALL apply the Default_Variant defined for that Section_Instance's section type.
9. IF persisting the selected Layout_Variant fails, THEN THE Style_Builder SHALL retain the previously persisted variant for that Section_Instance and display an error indication to the CMS_Editor.

### Requirement 6: Variant rendering and backward compatibility

**User Story:** As a platform owner, I want each section to render its selected variant and to keep its current look when no variant is chosen, so that adding variants does not disturb existing pages.

#### Acceptance Criteria

1. WHEN a Section_Instance has a selected Layout_Variant, THE Section_Renderer SHALL render that section using the markup for the selected variant.
2. IF a Section_Instance has no selected Layout_Variant, THEN THE Section_Renderer SHALL render that section using its Default_Variant.
3. THE Section_Renderer SHALL render the hero Default_Variant identically to the current hero appearance, preserving the existing `visualVariant` behavior of ticket, console, dashboard, and phone.
4. IF a Section_Instance stores a Layout_Variant value that is not defined for the section's type, THEN THE Section_Renderer SHALL render the Default_Variant for that section type without error.
5. WHILE the viewport width is between 320 and 767 pixels inclusive, THE Section_Renderer SHALL render every Layout_Variant such that content does not extend beyond the viewport width.

### Requirement 7: Multiple instances of the same section type

**User Story:** As a CMS_Editor, I want to add more than one section of the same type to a page, so that I can compose pages with, for example, two hero sections using different variants.

#### Acceptance Criteria

1. WHEN the CMS_Editor adds a section whose type already exists on the page, AND that page holds fewer than 20 instances of that type, THE Style_Builder SHALL create a new Section_Instance for that type rather than rejecting the request.
2. THE Style_Builder SHALL render each Section_Instance independently using its own `id`, `content`, Section_Settings, and Layout_Variant.
3. WHEN multiple Section_Instances of the same type exist on a page, THE Section_Renderer SHALL render each instance with its own configured content, producing no observable change in any other instance.
4. WHEN the CMS_Editor reorders, hides, edits, or deletes one Section_Instance, THE Style_Builder SHALL apply that action only to the instance with the targeted `id` and SHALL leave every other instance unchanged.
5. IF the CMS_Editor attempts to add a section type that already has 20 instances on the page, THEN THE Style_Builder SHALL reject the request, leave the page unchanged, and display an error indication stating the per-type limit was reached.
6. WHEN a Section_Instance has empty content (its `content` equals "{}"), THE Section_Renderer SHALL render it using the section type's default content while still treating it as a distinct, independently-ordered instance.
7. WHEN multiple Section_Instances of a type that reads from a shared collection (faq, testimonials, banner_slider) exist on a page, THE Section_Renderer SHALL read all such instances from the same shared collection, with each instance's own Section_Settings selecting which and how many items it displays.

### Requirement 8: Custom HTML sanitization

**User Story:** As a platform owner selling to many customers, I want editor-provided HTML to be sanitized before display, so that a malicious or careless entry cannot run scripts against visitors.

#### Acceptance Criteria

1. WHEN a custom_html Section_Instance is rendered on the public site, THE HTML_Sanitizer SHALL remove the elements script, iframe, object, embed, style, and form; remove every attribute whose name begins with "on"; and remove URLs using the javascript or vbscript scheme, before the markup is displayed.
2. IF an editor-provided URL (including a background image URL) uses a scheme other than http or https and is not a site-relative path beginning with "/", THEN THE Style_Builder SHALL omit the URL and SHALL issue no request to it.
3. IF editor-provided markup contains unsafe content, THEN THE HTML_Sanitizer SHALL neither emit nor execute the unsafe content while preserving the surrounding allow-listed markup so the section still renders.
4. THE HTML_Sanitizer SHALL preserve an allow-list of formatting elements (such as p, br, strong, em, ul, ol, li, a, h1 through h6, blockquote, img, span, div) and their safe attributes (such as href, src, alt, title, class) so that safe custom HTML continues to render.
5. THE HTML_Sanitizer SHALL perform sanitization on the server before the markup is delivered to the client.

### Requirement 9: Permission gating

**User Story:** As a platform owner, I want style and variant editing restricted to authorized staff, so that only trusted users can change public landing pages.

#### Acceptance Criteria

1. IF a request to read or modify Section_Settings or Layout_Variant arrives without an authenticated admin or sub-admin session, THEN THE Section_Settings_API SHALL respond with an unauthorized status and SHALL NOT modify any Section_Instance.
2. IF an authenticated sub-admin lacks the `editCms` permission, THEN THE Style_Builder SHALL deny access to the landing builder style and variant controls.
3. WHERE a user holds the `editCms` permission, THE Style_Builder SHALL allow that user to edit Section_Settings, select Layout_Variants, and add multiple Section_Instances.

### Requirement 10: Isolation from the API Management system

**User Story:** As a platform owner, I want this CMS feature to leave the order-processing platform untouched, so that orders received from external sites and forwarded to the supplier continue to work.

#### Acceptance Criteria

1. THE Style_Builder SHALL confine its server-side changes to CMS rendering and the existing admin CMS section endpoints under `/api/admin/cms/sections`.
2. THE Style_Builder SHALL NOT modify `/api/index.php`, `/api/public/v1/*`, `api-key-auth`, `api-auth`, `dhru-fusion`, `imei-order-worker`, `server-order-worker`, schedulers, or instrumentation.
3. THE Style_Builder SHALL apply only additive database changes and SHALL reuse the existing `PageSection.settings` and `PageSection.content` columns.
4. THE Style_Builder SHALL leave the structure and processing of order, API key, and wallet data unchanged.

### Requirement 11: Style and variant validation

**User Story:** As a CMS_Editor, I want invalid style or variant input to be rejected or corrected, so that a bad entry cannot break the public page.

#### Acceptance Criteria

1. WHEN the Section_Settings_API receives Section_Settings, THE Section_Settings_API SHALL validate the payload against the Style_Schema before persisting.
2. IF a submitted Section_Settings payload contains a key or value outside the Style_Schema, THEN THE Section_Settings_API SHALL reject the request with a validation error identifying the offending key or value, SHALL NOT persist the change, and SHALL retain the previously persisted settings unchanged.
3. WHEN the overlay opacity is provided as an integer within 0 to 100 inclusive, THE Section_Settings_API SHALL accept the value.
4. IF the overlay opacity is provided as a non-integer, a non-numeric value, or a number outside 0 to 100 inclusive, THEN THE Section_Settings_API SHALL reject the request with a validation error and SHALL NOT persist the change.
5. WHEN a Layout_Variant is provided that is defined for the Section_Instance's section type, THE Section_Settings_API SHALL accept the value.
6. IF a Layout_Variant is provided that is not defined for the Section_Instance's section type, THEN THE Section_Settings_API SHALL reject the request with a validation error and SHALL NOT persist the change.
