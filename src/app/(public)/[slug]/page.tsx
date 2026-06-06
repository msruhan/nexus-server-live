import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { renderMarkdown } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

// Reserved slugs that other routes claim — never let CustomPage shadow them
const RESERVED = new Set([
  'services',
  'login',
  'register',
  'admin',
  'user',
  'api',
  'uploads',
  '_next',
]);

async function getPage(slug: string) {
  if (RESERVED.has(slug)) return null;
  return prisma.customPage.findFirst({
    where: { slug, isPublished: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle ?? `${page.title} · Recovero`,
    description: page.metaDescription ?? undefined,
  };
}

export default async function CustomPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        § {page.slug}
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-5xl">
        {page.title}
      </h1>
      <hr className="my-8 border-line" />
      <div
        className="prose prose-ink max-w-none text-[16px] leading-relaxed text-ink"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
      />
    </article>
  );
}
