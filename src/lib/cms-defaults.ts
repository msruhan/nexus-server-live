// Defaults that mirror the curated editorial composition.
// Seeded the first time admin opens /admin/cms/landing-builder
// so the builder reflects what visitors actually see.

import { prisma } from './db';
import { defaultContent, type SectionType } from './cms-types';

type Default = { sectionType: SectionType; title?: string };

export const DEFAULT_HOME_SECTIONS: Default[] = [
  { sectionType: 'hero', title: 'Hero · live order ticket' },
  { sectionType: 'banner_slider', title: 'Promo banners · carousel' },
  { sectionType: 'service_catalog', title: 'Catalog · IMEI / Server' },
  { sectionType: 'method', title: 'Method · 7 step timeline' },
  { sectionType: 'stats', title: 'Stats · the numbers' },
  { sectionType: 'features', title: 'Features · principles' },
  { sectionType: 'testimonials', title: 'Voices · pull quote + grid' },
  { sectionType: 'faq', title: 'Notes · FAQ accordion' },
  { sectionType: 'partners', title: 'Partners · brand marquee' },
  { sectionType: 'cta', title: 'CTA · final call' },
];

export async function ensureDefaultSections(pageSlug = 'home') {
  const count = await prisma.pageSection.count({ where: { pageSlug } });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_HOME_SECTIONS.map((def, idx) =>
      prisma.pageSection.create({
        data: {
          pageSlug,
          sectionType: def.sectionType,
          title: def.title ?? null,
          sortOrder: (idx + 1) * 10,
          content: JSON.stringify(defaultContent(def.sectionType) ?? {}),
        },
      }),
    ),
  );
}

export async function resetToDefaults(pageSlug = 'home') {
  await prisma.pageSection.deleteMany({ where: { pageSlug } });
  await ensureDefaultSections(pageSlug);
}
