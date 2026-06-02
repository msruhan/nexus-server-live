import { prisma } from '@/lib/db';
import { isPrismaSchemaMissing } from '@/lib/site-settings-safe';
import { SectionRenderer } from '@/components/landing/SectionRenderer';
import { Hero } from '@/components/landing/Hero';
import { Ticker } from '@/components/landing/Ticker';
import { Catalog } from '@/components/landing/Catalog';
import { Method } from '@/components/landing/Method';
import { Stats } from '@/components/landing/Stats';
import { Bento } from '@/components/landing/Bento';
import { Voices } from '@/components/landing/Voices';
import { Notes } from '@/components/landing/Notes';
import { CTA } from '@/components/landing/CTA';
import { Partners } from '@/components/landing/Partners';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // If admin has authored sections, the CMS drives the page.
  // Otherwise we render the curated editorial default.
  let sections: Awaited<ReturnType<typeof prisma.pageSection.findMany>> = [];
  try {
    sections = await prisma.pageSection.findMany({
      where: { pageSlug: 'home', isVisible: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (error) {
    if (!isPrismaSchemaMissing(error)) throw error;
  }

  if (sections.length > 0) {
    return <SectionRenderer sections={sections} />;
  }

  return (
    <>
      <Ticker />
      <Hero />
      <Catalog />
      <Method />
      <Stats />
      <Bento />
      <Voices />
      <Notes />
      <Partners />
      <CTA />
    </>
  );
}
