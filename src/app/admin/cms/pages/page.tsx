import Link from 'next/link';
import { ArrowUpRight, Plus } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { NewPageButton } from './NewPageButton';

export const dynamic = 'force-dynamic';

export default async function PagesIndex() {
  const pages = await prisma.customPage.findMany({ orderBy: { updatedAt: 'desc' } });
  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Custom <span className="font-serif italic font-normal">pages</span>.
          </>
        }
        subtitle="About, T&C, Privacy, anything you need at /[slug]."
        actions={<NewPageButton />}
      />

      {pages.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">No custom pages yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                  <td className="px-4 py-3 font-medium text-ink">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.isPublished ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/cms/pages/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-primary-600"
                    >
                      Edit <ArrowUpRight weight="bold" size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
