import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SectionRenderer } from '@/components/landing/SectionRenderer';

export const dynamic = 'force-dynamic';

export default async function LandingPreview() {
  // Admin-only — middleware already enforces, but double-check
  const session = await auth();
  if (session?.user.role !== 'ADMIN') redirect('/login');

  // Show ALL sections, even hidden ones, so admin can see what's stored
  const sections = await prisma.pageSection.findMany({
    where: { pageSlug: 'home' },
    orderBy: { sortOrder: 'asc' },
  });

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          § Empty preview
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
          No sections yet.
        </h1>
        <p className="mt-3 font-serif italic text-ink-muted">
          Add a section in the builder and it will appear here.
        </p>
      </div>
    );
  }

  return <SectionRenderer sections={sections} />;
}
