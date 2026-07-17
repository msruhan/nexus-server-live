'use client';

import * as React from 'react';
import { ArrowUpRight, Info } from '@phosphor-icons/react/dist/ssr';
import { OrderModal, type ModalService } from './OrderModal';
import {
  ServiceDetailsModal,
  type ServiceDetails,
} from '@/components/services/ServiceDetailsModal';

export type ServiceRow = {
  modal: ModalService;
  description: string | null;
  badges: string[];
  groupTitle?: string | null;
};

export function MarketplaceServices({
  rows,
  isAuthenticated,
  loginNext,
  guestGateways,
  initialServiceId,
}: {
  rows: ServiceRow[];
  isAuthenticated: boolean;
  loginNext: string;
  guestGateways: Array<{ id: string; label: string }>;
  initialServiceId?: string | null;
}) {
  const [selected, setSelected] = React.useState<ModalService | null>(null);
  const [details, setDetails] = React.useState<ServiceDetails | null>(null);

  React.useEffect(() => {
    if (!initialServiceId) return;
    const row = rows.find((r) => r.modal.id === initialServiceId);
    if (row) setSelected(row.modal);
  }, [initialServiceId, rows]);

  if (rows.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
        <p className="font-serif text-lg italic text-ink-muted">
          No active services in this category yet.
        </p>
      </div>
    );
  }

  function openDetails(row: ServiceRow) {
    setDetails({
      title: row.modal.title,
      groupTitle: row.groupTitle,
      priceLabel: row.modal.priceLabel,
      deliveryTime: row.modal.deliveryTime,
      description: row.description,
      kindLabel: row.modal.kind === 'imei' ? 'IMEI service' : 'Server service',
    });
  }

  return (
    <>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div
            key={row.modal.id}
            className="flex items-center gap-2 py-3 sm:gap-4 sm:py-4"
          >
            <h3
              className="min-w-0 flex-1 line-clamp-2 break-words font-display text-sm font-extrabold leading-snug tracking-tight text-ink sm:text-base"
              title={row.modal.title}
            >
              {row.modal.title}
            </h3>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div
                className="shrink-0 whitespace-nowrap font-mono text-[10px] text-ink-muted sm:text-xs"
                title={row.modal.deliveryTime ?? undefined}
              >
                {row.modal.deliveryTime ?? '—'}
              </div>
              <div className="shrink-0 whitespace-nowrap font-display text-sm font-black tracking-tight text-ink sm:text-base">
                {row.modal.priceLabel}
              </div>
              <button
                type="button"
                onClick={() => openDetails(row)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-3 py-2 text-[11px] font-bold text-ink transition-colors hover:border-ink sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-xs"
              >
                Details
                <Info weight="bold" size={12} />
              </button>
              <button
                type="button"
                onClick={() => setSelected(row.modal)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-paper transition-colors hover:bg-primary-600 sm:gap-1.5 sm:px-5 sm:py-2.5 sm:text-xs"
              >
                Order
                <ArrowUpRight weight="bold" size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <OrderModal
        service={selected}
        isAuthenticated={isAuthenticated}
        loginNext={loginNext}
        guestGateways={guestGateways}
        onClose={() => setSelected(null)}
      />

      <ServiceDetailsModal service={details} onClose={() => setDetails(null)} />
    </>
  );
}
