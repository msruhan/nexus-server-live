import { prisma } from '@/lib/db';
import { isPrismaSchemaMissing } from '@/lib/site-settings-safe';
import { SectionRenderer } from '@/components/landing/SectionRenderer';
import { ensureDefaultSections } from '@/lib/cms-defaults';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let sections: Awaited<ReturnType<typeof prisma.pageSection.findMany>> = [];
  try {
    sections = await prisma.pageSection.findMany({
      where: { pageSlug: 'home', isVisible: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (sections.length === 0) {
      await ensureDefaultSections('home');
      sections = await prisma.pageSection.findMany({
        where: { pageSlug: 'home', isVisible: true },
        orderBy: { sortOrder: 'asc' },
      });
    }
  } catch (error) {
    if (!isPrismaSchemaMissing(error)) throw error;
  }

  if (sections.length === 0) {
    return null;
  }

  return <SectionRenderer sections={sections} />;
}
