'use client';

import { X } from '@phosphor-icons/react/dist/ssr';
import { sanitizeHtml } from '@/lib/sanitize-html';

export type ServiceDetails = {
  title: string;
  groupTitle?: string | null;
  priceLabel: string;
  deliveryTime?: string | null;
  description?: string | null;
  kindLabel?: string;
};

export function ServiceDetailsModal({
  service,
  onClose,
}: {
  service: ServiceDetails | null;
  onClose: () => void;
}) {
  if (!service) return null;

  const hasDescription = Boolean(service.description?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper-100 px-5 py-4">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              {service.kindLabel ?? 'Service details'}
            </span>
            <h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-ink">
              {service.title}
            </h3>
            {service.groupTitle && (
              <p className="mt-1 font-mono text-[10px] text-ink-muted">{service.groupTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line"
            aria-label="Close"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-ink px-4 py-1.5 font-display text-base font-extrabold tracking-tight text-paper">
              {service.priceLabel}
            </span>
            <span className="font-mono text-xs text-ink-muted">
              Delivery · {service.deliveryTime?.trim() ? service.deliveryTime : '—'}
            </span>
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Description
            </div>
            {hasDescription ? (
              <div
                className="prose prose-ink max-w-none text-sm leading-relaxed text-ink"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(service.description!) }}
              />
            ) : (
              <p className="font-serif text-sm italic text-ink-muted">
                No description provided for this service.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
