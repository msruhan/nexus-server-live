/**
 * SectionFrame — applies per-section visual style (background, padding,
 * alignment, max-width, dividers, optional background image + overlay).
 *
 * Backward-compatibility contract:
 *   - When `isDefault` is true, this is a ZERO-OVERHEAD pass-through: it
 *     returns the children unchanged so existing sections render exactly as
 *     before (no extra wrapper DOM).
 *   - Styling is applied only when the editor opts into a non-default style.
 *
 * Server component (no client JS).
 */
import * as React from 'react';
import {
  backgroundClasses,
  paddingClasses,
  widthClasses,
  alignClasses,
  isDefaultStyle,
  type SectionStyle,
} from '@/lib/cms-style';

export function SectionFrame({
  style,
  sectionType,
  children,
}: {
  style: SectionStyle;
  sectionType?: string;
  children: React.ReactNode;
}) {
  // Pass-through when nothing is customized → identical to pre-feature DOM.
  if (isDefaultStyle(style, sectionType)) {
    return <>{children}</>;
  }

  const bg = backgroundClasses(style);
  const padding = paddingClasses(style.padding);
  const width = widthClasses(style.width);
  const align = alignClasses(style.align);
  const hasImage = style.background === 'image' && !!style.bgImageUrl;

  const dividerTop = style.dividerTop === 'line' ? 'border-t border-line' : '';
  const dividerBottom = style.dividerBottom === 'line' ? 'border-b border-line' : '';

  return (
    <section
      className={`relative overflow-hidden ${bg.wrapper} ${dividerTop} ${dividerBottom}`.trim()}
      data-cms-styled="true"
      data-cms-dark={bg.isDark ? 'true' : undefined}
    >
      {/* Background image + overlay layers (below content) */}
      {hasImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={style.bgImageUrl as string}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-ink"
            style={{ opacity: style.bgOverlay / 100 }}
          />
        </>
      )}

      <div className={`relative ${padding}`}>
        <div className={`mx-auto px-6 lg:px-10 ${width} ${align}`.trim()}>{children}</div>
      </div>
    </section>
  );
}
