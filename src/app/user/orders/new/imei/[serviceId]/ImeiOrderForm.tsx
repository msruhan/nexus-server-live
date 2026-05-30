'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUpRight, Warning } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Requires = {
  imei: boolean;
  network: boolean;
  model: boolean;
  provider: boolean;
  pin: boolean;
  kbh: boolean;
  mep: boolean;
  prd: boolean;
  sn: boolean;
  email: boolean;
  note: boolean;
};

type DuplicateInfo = {
  orderCode: string;
  serviceTitle: string;
  status: string;
  referenceId: string | null;
};

function DuplicateOrderDialog({
  open,
  message,
  duplicate,
  deviceLabel,
  loading,
  onCancel,
  onContinue,
}: {
  open: boolean;
  message: string;
  duplicate: DuplicateInfo;
  deviceLabel: string;
  loading: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-amber-300 bg-paper p-6 shadow-xl"
        role="dialog"
        aria-labelledby="duplicate-order-title"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Warning weight="fill" size={22} />
          </div>
          <div className="min-w-0">
            <h3 id="duplicate-order-title" className="font-display text-lg font-bold text-ink">
              Duplicate order
            </h3>
            <p className="mt-2 text-sm text-ink-muted">{message}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 rounded-xl border border-line bg-paper-50 px-4 py-3 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="font-mono uppercase tracking-wider text-ink-muted">Order</dt>
            <dd className="font-mono font-medium text-ink">{duplicate.orderCode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono uppercase tracking-wider text-ink-muted">Service</dt>
            <dd className="text-right font-medium text-ink">{duplicate.serviceTitle}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-mono uppercase tracking-wider text-ink-muted">Status</dt>
            <dd className="font-mono text-ink">{duplicate.status}</dd>
          </div>
          {duplicate.referenceId && (
            <div className="flex justify-between gap-4">
              <dt className="font-mono uppercase tracking-wider text-ink-muted">Upstream ref</dt>
              <dd className="font-mono text-ink">{duplicate.referenceId}</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 text-xs text-ink-muted">
          {duplicate.status === 'SUCCESS'
            ? `This service already completed successfully for the same ${deviceLabel}. If you continue, your wallet will be charged again and the supplier may reject it as a duplicate order.`
            : `If you continue, a new order will still be sent to the supplier. They may reject it with "Duplicate order" if the same ${deviceLabel} is still active on their side.`}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={onContinue} disabled={loading}>
            {loading ? 'Processing…' : 'Continue order'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImeiOrderForm({
  serviceId,
  requires,
}: {
  serviceId: string;
  requires: Requires;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [duplicateDialog, setDuplicateDialog] = React.useState<{
    message: string;
    duplicate: DuplicateInfo;
    payload: Record<string, string>;
  } | null>(null);

  const deviceLabel =
    requires.sn && !requires.imei
      ? 'Serial Number'
      : requires.imei && requires.sn
        ? 'IMEI / Serial Number'
        : 'IMEI';

  async function placeOrder(payload: Record<string, string>, acknowledgeDuplicate = false) {
    const res = await fetch('/api/imei/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, acknowledgeDuplicate }),
    });
    const j = await res.json().catch(() => ({}));

    if (res.status === 409 && j.code === 'DUPLICATE_ORDER' && j.duplicate && !acknowledgeDuplicate) {
      setDuplicateDialog({
        message: j.error ?? 'This device is still being processed.',
        duplicate: j.duplicate as DuplicateInfo,
        payload,
      });
      return { ok: false as const };
    }

    if (!res.ok || !j.success) {
      toast.error('Order failed', { description: j.error ?? 'Please try again.' });
      return { ok: false as const };
    }

    toast.success('Docket submitted', { description: j.data?.orderCode });
    router.push(`/user/orders/${j.data?.id}?type=imei`);
    router.refresh();
    return { ok: true as const };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = { serviceId };
    fd.forEach((v, k) => {
      const s = String(v).trim();
      if (s) payload[k] = s;
    });

    try {
      const params = new URLSearchParams({ serviceId });
      if (payload.imei) params.set('imei', payload.imei);
      if (payload.serialNumber) params.set('serialNumber', payload.serialNumber);

      const checkRes = await fetch(`/api/imei/orders/check-duplicate?${params.toString()}`);
      const checkJson = await checkRes.json().catch(() => ({}));

      if (checkRes.ok && checkJson.success && checkJson.data?.duplicate && checkJson.data?.existing) {
        setDuplicateDialog({
          message: checkJson.data.message ?? 'This device is still being processed.',
          duplicate: checkJson.data.existing as DuplicateInfo,
          payload,
        });
        return;
      }

      await placeOrder(payload, false);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDuplicateContinue() {
    if (!duplicateDialog) return;
    setLoading(true);
    try {
      const result = await placeOrder(duplicateDialog.payload, true);
      if (result.ok) setDuplicateDialog(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6 lg:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {requires.imei && (
            <div className="sm:col-span-2">
              <Input
                name="imei"
                label="IMEI"
                placeholder="15 digits"
                hint="Device IMEI — find it in Settings or dial *#06#"
                pattern="[0-9]{14,16}"
                maxLength={16}
                required
              />
            </div>
          )}
          {requires.network && (
            <Input name="network" label="Network / Carrier" placeholder="T-Mobile USA" required />
          )}
          {requires.model && <Input name="model" label="Model" placeholder="SM-S928B" required />}
          {requires.provider && <Input name="provider" label="Provider" required />}
          {requires.pin && <Input name="pin" label="PIN" required />}
          {requires.kbh && <Input name="kbh" label="KBH code" required />}
          {requires.mep && <Input name="mep" label="MEP code" required />}
          {requires.prd && <Input name="prd" label="PRD code" required />}
          {requires.sn && <Input name="serialNumber" label="Serial Number" required />}
          {requires.email && <Input name="email" type="email" label="Email" required />}
        </div>
        {requires.note && (
          <Textarea
            name="note"
            label="Note"
            placeholder="Additional information (optional)"
            rows={3}
          />
        )}

        <div className="flex items-center gap-3 border-t border-line pt-5">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit docket'}
            {!loading && <ArrowUpRight weight="bold" size={14} />}
          </Button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
        <p className="font-serif text-xs italic text-ink-muted">
          Your wallet is charged before the order is sent upstream. Auto-refund if rejected.
        </p>
      </form>

      <DuplicateOrderDialog
        open={!!duplicateDialog}
        message={duplicateDialog?.message ?? ''}
        duplicate={
          duplicateDialog?.duplicate ?? {
            orderCode: '—',
            serviceTitle: '—',
            status: '—',
            referenceId: null,
          }
        }
        deviceLabel={deviceLabel}
        loading={loading}
        onCancel={() => setDuplicateDialog(null)}
        onContinue={confirmDuplicateContinue}
      />
    </>
  );
}
