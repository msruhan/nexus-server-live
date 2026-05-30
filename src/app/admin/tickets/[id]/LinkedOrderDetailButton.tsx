'use client';

import * as React from 'react';
import Link from 'next/link';
import { X, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { formatDate, formatUSD } from '@/lib/format';

type OrderType = 'imei' | 'server';

type ImeiOrderPayload = {
  orderCode: string;
  status: string;
  imei: string;
  price: string | number;
  network?: string | null;
  model?: string | null;
  provider?: string | null;
  serialNumber?: string | null;
  note?: string | null;
  code?: string | null;
  comments?: string | null;
  referenceId?: string | null;
  createdAt: string;
  processedAt?: string | null;
  completedAt?: string | null;
  user: { name: string; email: string };
  service: {
    title: string;
    requiresImei?: boolean;
    group?: { title: string } | null;
  };
};

type ServerOrderPayload = {
  orderCode: string;
  status: string;
  price: string | number;
  email?: string | null;
  notes?: string | null;
  requiredFields?: string | null;
  code?: string | null;
  comments?: string | null;
  referenceId?: string | null;
  createdAt: string;
  processedAt?: string | null;
  completedAt?: string | null;
  user: { name: string; email: string };
  service: { title: string; box?: { title: string } | null };
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-line py-2.5 last:border-0">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="col-span-2 break-all text-sm text-ink">{value}</dd>
    </div>
  );
}

export function LinkedOrderDetailButton({
  orderId,
  orderType,
  orderCode,
}: {
  orderId: string;
  orderType: OrderType;
  orderCode: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [imeiOrder, setImeiOrder] = React.useState<ImeiOrderPayload | null>(null);
  const [serverOrder, setServerOrder] = React.useState<ServerOrderPayload | null>(null);

  const fullPageHref =
    orderType === 'imei' ? `/admin/orders/${orderId}` : `/admin/orders/${orderId}?type=server`;

  async function openModal() {
    setOpen(true);
    if ((orderType === 'imei' && imeiOrder) || (orderType === 'server' && serverOrder)) return;

    setLoading(true);
    const url =
      orderType === 'imei'
        ? `/api/admin/imei/orders/${orderId}`
        : `/api/admin/imei/server-orders/${orderId}`;

    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error('Failed to load order', { description: json.error ?? 'Unknown error' });
        setOpen(false);
        return;
      }
      if (orderType === 'imei') setImeiOrder(json.data as ImeiOrderPayload);
      else setServerOrder(json.data as ServerOrderPayload);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const order = orderType === 'imei' ? imeiOrder : serverOrder;

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink transition-colors hover:border-ink hover:bg-paper-200"
        title="View linked order details"
      >
        <Package size={14} weight="bold" />
        View order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="linked-order-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  {orderType === 'imei' ? 'IMEI order' : 'Server order'}
                </p>
                <h2 id="linked-order-title" className="mt-1 font-display text-lg font-extrabold text-ink">
                  {orderCode}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-paper-200 hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              {loading && (
                <p className="py-8 text-center text-sm text-ink-muted">Loading order details…</p>
              )}

              {!loading && order && orderType === 'imei' && imeiOrder && (
                <dl>
                  <DetailRow label="Service" value={imeiOrder.service.title} />
                  {imeiOrder.service.group?.title && (
                    <DetailRow label="Group" value={imeiOrder.service.group.title} />
                  )}
                  <DetailRow
                    label="Status"
                    value={<StatusPill status={imeiOrder.status} />}
                  />
                  <DetailRow label="User" value={`${imeiOrder.user.name} · ${imeiOrder.user.email}`} />
                  <DetailRow label="Price" value={formatUSD(imeiOrder.price)} />
                  {(imeiOrder.service.requiresImei ?? true) && (
                    <DetailRow label="IMEI" value={<span className="font-mono">{imeiOrder.imei}</span>} />
                  )}
                  <DetailRow label="Network" value={imeiOrder.network} />
                  <DetailRow label="Model" value={imeiOrder.model} />
                  <DetailRow label="Provider" value={imeiOrder.provider} />
                  <DetailRow label="Serial" value={imeiOrder.serialNumber} />
                  <DetailRow label="Note" value={imeiOrder.note} />
                  <DetailRow label="Upstream ID" value={imeiOrder.referenceId} />
                  {imeiOrder.code && (
                    <DetailRow
                      label="Result code"
                      value={<code className="font-mono text-xs">{imeiOrder.code}</code>}
                    />
                  )}
                  {imeiOrder.comments && <DetailRow label="Comments" value={imeiOrder.comments} />}
                  <DetailRow label="Created" value={formatDate(imeiOrder.createdAt)} />
                  <DetailRow label="In process" value={formatDate(imeiOrder.processedAt)} />
                  <DetailRow label="Completed" value={formatDate(imeiOrder.completedAt)} />
                </dl>
              )}

              {!loading && order && orderType === 'server' && serverOrder && (
                <dl>
                  <DetailRow label="Service" value={serverOrder.service.title} />
                  {serverOrder.service.box?.title && (
                    <DetailRow label="Group" value={serverOrder.service.box.title} />
                  )}
                  <DetailRow
                    label="Status"
                    value={<StatusPill status={serverOrder.status} />}
                  />
                  <DetailRow label="User" value={`${serverOrder.user.name} · ${serverOrder.user.email}`} />
                  <DetailRow label="Price" value={formatUSD(serverOrder.price)} />
                  <DetailRow label="Email" value={serverOrder.email} />
                  <DetailRow label="Notes" value={serverOrder.notes} />
                  <DetailRow label="Fields" value={serverOrder.requiredFields} />
                  <DetailRow label="Upstream ID" value={serverOrder.referenceId} />
                  {serverOrder.code && (
                    <DetailRow
                      label="Result code"
                      value={<code className="font-mono text-xs">{serverOrder.code}</code>}
                    />
                  )}
                  {serverOrder.comments && <DetailRow label="Comments" value={serverOrder.comments} />}
                  <DetailRow label="Created" value={formatDate(serverOrder.createdAt)} />
                  <DetailRow label="In process" value={formatDate(serverOrder.processedAt)} />
                  <DetailRow label="Completed" value={formatDate(serverOrder.completedAt)} />
                </dl>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
              <Link href={fullPageHref}>
                <Button type="button" size="sm" onClick={close}>
                  Open full page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
