'use client';

import { DownloadSimple } from '@phosphor-icons/react';

export function OrdersExportButton({
  kind,
  status,
}: {
  kind: string;
  status: string;
}) {
  const params = new URLSearchParams();
  if (kind !== 'all') params.set('kind', kind);
  if (status !== 'all') params.set('status', status);
  const qs = params.toString();

  return (
    <a
      href={`/api/admin/orders/export${qs ? `?${qs}` : ''}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-paper-200"
    >
      <DownloadSimple size={13} weight="bold" />
      Export CSV
    </a>
  );
}
