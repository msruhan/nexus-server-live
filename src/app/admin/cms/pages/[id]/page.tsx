import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CustomPageEditor } from './CustomPageEditor';

export const dynamic = 'force-dynamic';

export default async function CustomPageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.customPage.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <div>
      <Link
        href="/admin/cms/pages"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
      >
        ← All custom pages
      </Link>

      <div className="mt-4 mb-8 border-b border-line pb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          § Editing custom page
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-muted">
          Live at <Link href={`/${page.slug}`} className="text-primary-600 hover:underline">/{page.slug}</Link>
        </p>
      </div>

      <CustomPageEditor
        initial={{
          id: page.id,
          slug: page.slug,
          title: page.title,
          content: page.content,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          isPublished: page.isPublished,
        }}
      />
    </div>
  );
}
