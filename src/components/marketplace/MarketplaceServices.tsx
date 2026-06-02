'use client';

import * as React from 'react';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { OrderModal, type ModalService } from './OrderModal';

export type ServiceRow = {
  modal: ModalService;
  description: string | null;
  badges: string[];
};

export function MarketplaceServices({
  rows,
  isAuthenticated,
  loginNext,
  guestGateways,
}: {
  rows: ServiceRow[];
  isAuthenticated: boolean;
  loginNext: string;
  guestGateways: Array<{ id: string; label: string }>;
}) {
  const [selected, setSelected] = React.useState<ModalService | null>(null);

  if (rows.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
        <p className="font-serif text-lg italic text-ink-muted">
          No active services in this category yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div
            key={row.modal.id}
            className="flex flex-wrap items-center gap-4 py-6 lg:flex-nowrap"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                {row.modal.title}
              </h3>
              {row.description && (
                <p className="mt-1 line-clamp-2 font-serif italic text-ink-muted">{row.description}</p>
              )}
              {row.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-md bg-paper-200 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {row.modal.deliveryTime && (
              <div className="font-mono text-sm text-ink-muted lg:w-32">{row.modal.deliveryTime}</div>
            )}
            <div className="font-display text-xl font-black tracking-tight text-ink lg:w-32 lg:text-right">
              {row.modal.priceLabel}
            </div>
            <button
              type="button"
              onClick={() => setSelected(row.modal)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-paper transition-colors hover:bg-primary-600"
            >
              Order
              <ArrowUpRight weight="bold" size={12} />
            </button>
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
    </>
  );
}
