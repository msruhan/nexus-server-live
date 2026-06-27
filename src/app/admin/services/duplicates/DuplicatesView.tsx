'use client';

import * as React from 'react';
import Link from 'next/link';

type DuplicateGroup = {
  kind: 'imei' | 'server';
  reason: 'toolId' | 'title';
  key: string;
  services: Array<{
    id: string;
    title: string;
    toolId: string | null;
    apiId: string;
    apiTitle: string;
    status: string;
    price: string;
  }>;
};

export function DuplicatesView() {
  const [loading, setLoading] = React.useState(true);
  const [groups, setGroups] = React.useState<DuplicateGroup[]>([]);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/services/duplicates');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) setGroups(json.data.groups ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-ink-muted">Scanning catalog…</div>;

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-paper-50 p-8 text-center text-sm text-ink-muted">
        No duplicate services detected (by toolId or matching title).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g, i) => (
        <div key={`${g.kind}-${g.reason}-${g.key}-${i}`} className="rounded-xl border border-line bg-paper-50 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] uppercase text-paper">
              {g.kind}
            </span>
            <span className="font-display text-sm font-bold text-ink">
              {g.reason === 'toolId' ? `Duplicate toolId: ${g.key}` : `Similar title: ${g.key}`}
            </span>
            <span className="text-xs text-ink-muted">{g.services.length} entries</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-ink-muted">
                <th className="pb-2">Title</th>
                <th className="pb-2">Provider</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {g.services.map((s) => (
                <tr key={s.id} className="border-t border-line/50">
                  <td className="py-2">{s.title}</td>
                  <td className="py-2 text-ink-muted">{s.apiTitle}</td>
                  <td className="py-2">{s.status}</td>
                  <td className="py-2 text-right font-mono">${Number(s.price).toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <Link
                      href={
                        g.kind === 'imei'
                          ? `/admin/services/imei?highlight=${s.id}`
                          : `/admin/services/server?highlight=${s.id}`
                      }
                      className="text-xs font-semibold text-ink underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
