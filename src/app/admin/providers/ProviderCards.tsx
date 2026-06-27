'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUpRight, Trash } from '@phosphor-icons/react/dist/ssr';
import { StatusPill } from '@/components/ui/StatusPill';
import { relativeTime } from '@/lib/format';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export type ProviderCardItem = {
  id: string;
  title: string;
  host: string;
  status: string;
  updatedAt: string;
  servicesCount: number;
  serverServicesCount: number;
};

export function ProviderCards({ providers }: { providers: ProviderCardItem[] }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function removeProvider(p: ProviderCardItem) {
    const linked = p.servicesCount + p.serverServicesCount;
    const ok = await confirmDialog({
      title: linked > 0 ? 'Cannot delete provider' : 'Delete provider',
      description:
        linked > 0
          ? `"${p.title}" has ${linked} linked service(s). Remove those catalog entries first, then try again.`
          : `Delete "${p.title}"? This removes the upstream connection configuration only.`,
      confirmLabel: linked > 0 ? 'Understood' : 'Delete',
      tone: linked > 0 ? 'warning' : 'danger',
    });
    if (!ok || linked > 0) return;

    setDeletingId(p.id);
    const res = await fetch(`/api/admin/imei/apis/${p.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    setDeletingId(null);

    if (!res.ok || !json.success) {
      toast.error('Delete failed', { description: json.error ?? 'Unknown error' });
      return;
    }

    toast.success('Provider deleted', { description: p.title });
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((p) => {
        const totalServices = p.servicesCount + p.serverServicesCount;
        const busy = deletingId === p.id;

        return (
          <article
            key={p.id}
            className="group relative rounded-2xl border border-line bg-paper-50 transition-all hover:border-ink hover:shadow-card-hover"
          >
            <Link
              href={`/admin/providers/${p.id}`}
              className="block p-6 pr-14"
              aria-label={`Open ${p.title}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-lg font-extrabold tracking-tight text-ink">
                      {p.title}
                    </h3>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-ink-muted">{p.host}</div>
                </div>
                <ArrowUpRight
                  weight="bold"
                  size={16}
                  className="shrink-0 text-ink-soft transition-transform group-hover:rotate-45"
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Balance
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold text-ink">—</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Services
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold text-ink">
                    {totalServices}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Last sync
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-ink">
                    {relativeTime(p.updatedAt)}
                  </div>
                </div>
              </div>
            </Link>

            <button
              type="button"
              disabled={busy}
              aria-label={`Delete ${p.title}`}
              title={totalServices > 0 ? 'Remove linked services before deleting' : 'Delete provider'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void removeProvider(p);
              }}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
            >
              <Trash weight="bold" size={14} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
