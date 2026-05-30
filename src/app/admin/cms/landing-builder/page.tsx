import { prisma } from '@/lib/db';
import { ensureDefaultSections } from '@/lib/cms-defaults';
import { LandingBuilder } from './LandingBuilder';

export const dynamic = 'force-dynamic';

export default async function LandingBuilderPage() {
  // First-time admin opens the builder → seed the curated default
  // composition so what they see matches the public surface.
  await ensureDefaultSections('home');

  const sections = await prisma.pageSection.findMany({
    where: { pageSlug: 'home' },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <LandingBuilder
      initial={sections.map((s) => ({
        id: s.id,
        sectionType: s.sectionType,
        title: s.title,
        subtitle: s.subtitle,
        content: safeJson(s.content),
        isVisible: s.isVisible,
      }))}
    />
  );
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
