import Link from 'next/link';
import {
  ArrowUpRight,
  Layout,
  Image as ImageIcon,
  TextAa,
  ListBullets,
  Question,
  ChatTeardrop,
  Folders,
  FilePlus,
  Palette,
} from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function CmsHub() {
  const [
    sectionCount,
    bannerCount,
    runningAdCount,
    menuCount,
    faqCount,
    testimonialCount,
    pageCount,
    mediaCount,
  ] = await Promise.all([
    prisma.pageSection.count(),
    prisma.banner.count(),
    prisma.runningAd.count(),
    prisma.navigationMenu.count(),
    prisma.faqItem.count(),
    prisma.testimonial.count(),
    prisma.customPage.count(),
    prisma.mediaFile.count(),
  ]);

  const tiles = [
    {
      href: '/admin/cms/landing-builder',
      icon: Layout,
      title: 'Landing builder',
      desc: 'Drag &amp; drop sections, edit content, toggle visibility.',
      count: sectionCount,
      countLabel: 'sections',
      span: 2,
      accent: true,
    },
    {
      href: '/admin/cms/palette',
      icon: Palette,
      title: 'Palette & theme',
      desc: 'Curated templates · Theatre · Earth tone · Festive · Coastal · custom.',
      count: 8,
      countLabel: 'templates',
    },
    {
      href: '/admin/cms/banners',
      icon: ImageIcon,
      title: 'Banners',
      desc: 'Upload, schedule, position, track clicks.',
      count: bannerCount,
      countLabel: 'banners',
    },
    {
      href: '/admin/cms/running-ads',
      icon: TextAa,
      title: 'Running ads',
      desc: 'Ticker text running across the top.',
      count: runningAdCount,
      countLabel: 'ads',
    },
    {
      href: '/admin/cms/menus',
      icon: ListBullets,
      title: 'Navigation menus',
      desc: 'Header, footer, mobile · drag-reorder.',
      count: menuCount,
      countLabel: 'items',
    },
    {
      href: '/admin/cms/faq',
      icon: Question,
      title: 'FAQ',
      desc: 'Group by category, reorder, hide.',
      count: faqCount,
      countLabel: 'items',
    },
    {
      href: '/admin/cms/testimonials',
      icon: ChatTeardrop,
      title: 'Testimonials',
      desc: 'Reseller voices · name, role, rating.',
      count: testimonialCount,
      countLabel: 'voices',
    },
    {
      href: '/admin/cms/pages',
      icon: FilePlus,
      title: 'Custom pages',
      desc: 'About, T&amp;C, Privacy · live at /[slug].',
      count: pageCount,
      countLabel: 'pages',
    },
    {
      href: '/admin/cms/media',
      icon: Folders,
      title: 'Media library',
      desc: 'Upload images & files · re-use anywhere.',
      count: mediaCount,
      countLabel: 'files',
    },
  ];

  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Edit the bureau&rsquo;s <span className="font-serif italic font-normal">storefront</span>.
          </>
        }
        subtitle="Everything visible to the public — landing sections, banners, navigation, FAQ, testimonials, custom pages, media."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-card-hover ${
              t.accent
                ? 'border-primary-700 bg-primary-500 text-paper hover:bg-primary-600'
                : 'border-line bg-paper-50 hover:border-ink'
            } ${t.span === 2 ? 'sm:col-span-2 lg:col-span-2' : ''}`}
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  t.accent
                    ? 'bg-paper/15 text-paper'
                    : 'bg-ink text-paper'
                }`}
              >
                <t.icon weight="duotone" size={20} />
              </span>
              <ArrowUpRight
                weight="bold"
                size={16}
                className={`transition-transform group-hover:rotate-45 ${
                  t.accent ? 'text-paper/70' : 'text-ink-soft'
                }`}
              />
            </div>
            <h3 className="mt-5 font-display text-xl font-extrabold tracking-tight">{t.title}</h3>
            <p
              className={`mt-1 font-serif text-sm italic ${
                t.accent ? 'text-paper/85' : 'text-ink-muted'
              }`}
              dangerouslySetInnerHTML={{ __html: t.desc }}
            />
            <div
              className={`mt-6 flex items-baseline gap-2 ${
                t.accent ? 'text-paper' : 'text-ink'
              }`}
            >
              <span className="font-display text-2xl font-black tracking-tight">{t.count}</span>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  t.accent ? 'text-paper/70' : 'text-ink-muted'
                }`}
              >
                {t.countLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
