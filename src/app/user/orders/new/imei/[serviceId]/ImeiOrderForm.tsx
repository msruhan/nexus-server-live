'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUpRight, Warning } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { ImeiOrderFields, type ImeiRequires } from '@/components/orders/ImeiOrderFields';
import {
  bulkDeviceFieldLabel,
  MAX_BULK_ORDER_LINES,
  parseBulkOrderLines,
  resolveBulkDeviceField,
  type BulkDeviceField,
} from '@/lib/imei-bulk-order';

type Requires = ImeiRequires;

type DuplicateInfo = {
  orderCode: string;
  serviceTitle: string;
  status: string;
  referenceId: string | null;
};

type PlaceOrderResult =
  | { ok: true; orderCode?: string; orderId?: string }
  | {
      ok: false;
      duplicate?: DuplicateInfo;
      message?: string;
      payload: Record<string, string>;
    };

type BulkQueueState = {
  lines: string[];
  basePayload: Record<string, string>;
  bulkField: BulkDeviceField;
  index: number;
  succeeded: string[];
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

function BulkOrderConfirmDialog({
  open,
  count,
  deviceLabel,
  totalCostLabel,
  loading,
  onReject,
  onConfirm,
}: {
  open: boolean;
  count: number;
  deviceLabel: string;
  totalCostLabel: string;
  loading: boolean;
  onReject: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl"
        role="dialog"
        aria-labelledby="bulk-order-title"
      >
        <h3 id="bulk-order-title" className="font-display text-lg font-bold text-ink">
          Bulk order
        </h3>
        <p className="mt-3 text-sm text-ink-muted">
          Are you sure you want to submit bulk order?
        </p>
        <p className="mt-2 text-sm text-ink">
          {count} orders ({deviceLabel}) will be sent sequentially upstream. Total charge:{' '}
          <span className="font-semibold">{totalCostLabel}</span>.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onReject} disabled={loading}>
            Reject
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Submitting…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildPayloadFromFormData(fd: FormData, serviceId: string): Record<string, string> {
  const payload: Record<string, string> = { serviceId };
  fd.forEach((v, k) => {
    if (k === 'bulkOrder') return;
    const s = String(v).trim();
    if (s) payload[k] = s;
  });
  return payload;
}

function buildBulkItemPayload(
  basePayload: Record<string, string>,
  bulkField: BulkDeviceField,
  value: string,
): Record<string, string> {
  const payload = { ...basePayload };
  delete payload.imei;
  delete payload.serialNumber;
  delete payload.ecid;
  payload[bulkField] = value;
  return payload;
}

export function ImeiOrderForm({
  serviceId,
  requires,
  unitPrice,
  walletBalance,
}: {
  serviceId: string;
  requires: Requires;
  unitPrice: number;
  walletBalance: number;
}) {
  const router = useRouter();
  const bulkDeviceField = resolveBulkDeviceField(requires);
  const [loading, setLoading] = React.useState(false);
  const [bulkConfirm, setBulkConfirm] = React.useState<{
    lines: string[];
    basePayload: Record<string, string>;
    bulkField: BulkDeviceField;
  } | null>(null);
  const [bulkQueue, setBulkQueue] = React.useState<BulkQueueState | null>(null);
  const [duplicateDialog, setDuplicateDialog] = React.useState<{
    message: string;
    duplicate: DuplicateInfo;
    payload: Record<string, string>;
    bulkResume?: BulkQueueState;
  } | null>(null);

  const deviceLabel = [
    requires.imei && 'IMEI',
    requires.sn && 'Serial Number',
    requires.ecid && 'ECID',
  ]
    .filter(Boolean)
    .join(' / ') || 'Device identifier';

  const bulkLabel = bulkDeviceField ? bulkDeviceFieldLabel(bulkDeviceField) : deviceLabel;

  async function placeOrder(
    payload: Record<string, string>,
    acknowledgeDuplicate = false,
    options?: { redirectOnSuccess?: boolean },
  ): Promise<PlaceOrderResult> {
    const res = await fetch('/api/imei/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, acknowledgeDuplicate }),
    });
    const j = await res.json().catch(() => ({}));

    if (res.status === 409 && j.code === 'DUPLICATE_ORDER' && j.duplicate && !acknowledgeDuplicate) {
      return {
        ok: false,
        duplicate: j.duplicate as DuplicateInfo,
        message: j.error ?? 'This device is still being processed.',
        payload,
      };
    }

    if (!res.ok || !j.success) {
      toast.error('Order failed', { description: j.error ?? 'Please try again.' });
      return { ok: false, payload };
    }

    if (options?.redirectOnSuccess !== false) {
      toast.success('Docket submitted', { description: j.data?.orderCode });
      router.push(`/user/orders/${j.data?.id}?type=imei`);
      router.refresh();
    }

    return { ok: true, orderCode: j.data?.orderCode, orderId: j.data?.id };
  }

  async function checkDuplicate(payload: Record<string, string>): Promise<DuplicateInfo | null> {
    const params = new URLSearchParams({ serviceId });
    if (payload.imei) params.set('imei', payload.imei);
    if (payload.serialNumber) params.set('serialNumber', payload.serialNumber);
    if (payload.ecid) params.set('ecid', payload.ecid);

    const checkRes = await fetch(`/api/imei/orders/check-duplicate?${params.toString()}`);
    const checkJson = await checkRes.json().catch(() => ({}));

    if (checkRes.ok && checkJson.success && checkJson.data?.duplicate && checkJson.data?.existing) {
      return checkJson.data.existing as DuplicateInfo;
    }
    return null;
  }

  function finishBulkQueue(queue: BulkQueueState, failedAt?: string) {
    const total = queue.lines.length;
    const succeeded = queue.succeeded.length;

    if (failedAt) {
      toast.error('Bulk order stopped', {
        description: `${succeeded} of ${total} submitted. Failed at ${failedAt}.`,
      });
    } else if (succeeded === total) {
      toast.success('Bulk order complete', {
        description: `${succeeded} dockets submitted sequentially.`,
      });
      router.push('/user/orders?type=imei');
      router.refresh();
    }

    setBulkQueue(null);
    setBulkConfirm(null);
  }

  async function processBulkQueue(queue: BulkQueueState, acknowledgeDuplicate = false) {
    setBulkQueue(queue);
    let current = { ...queue };

    for (let i = current.index; i < current.lines.length; i++) {
      const value = current.lines[i];
      const payload = buildBulkItemPayload(current.basePayload, current.bulkField, value);

      const result = await placeOrder(payload, acknowledgeDuplicate, { redirectOnSuccess: false });

      if (!result.ok) {
        if (result.duplicate && !acknowledgeDuplicate) {
          setDuplicateDialog({
            message: result.message ?? 'This device is still being processed.',
            duplicate: result.duplicate,
            payload,
            bulkResume: { ...current, index: i },
          });
          return;
        }
        finishBulkQueue(current, value);
        return;
      }

      current = {
        ...current,
        index: i + 1,
        succeeded: [...current.succeeded, result.orderCode ?? value],
      };
      setBulkQueue(current);
      acknowledgeDuplicate = false;
    }

    finishBulkQueue(current);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const fd = new FormData(e.currentTarget);
      const basePayload = buildPayloadFromFormData(fd, serviceId);
      const bulkText = String(fd.get('bulkOrder') ?? '').trim();
      const bulkLines = bulkText ? parseBulkOrderLines(bulkText) : [];

      if (bulkLines.length > 0) {
        if (!bulkDeviceField) {
          toast.error('Bulk order unavailable', {
            description: 'Bulk order is only available when a single device field (IMEI, SN, or ECID) is required.',
          });
          return;
        }

        if (bulkLines.length > MAX_BULK_ORDER_LINES) {
          toast.error('Too many lines', {
            description: `Bulk order supports up to ${MAX_BULK_ORDER_LINES} lines.`,
          });
          return;
        }

        const totalCost = bulkLines.length * unitPrice;
        if (totalCost > walletBalance) {
          toast.error('Insufficient balance', {
            description: `Need $${totalCost.toFixed(2)} for ${bulkLines.length} orders.`,
          });
          return;
        }

        if (bulkLines.length >= 2) {
          setBulkConfirm({
            lines: bulkLines,
            basePayload,
            bulkField: bulkDeviceField,
          });
          return;
        }

        const payload = buildBulkItemPayload(basePayload, bulkDeviceField, bulkLines[0]);
        const duplicate = await checkDuplicate(payload);
        if (duplicate) {
          setDuplicateDialog({
            message: 'This device is still being processed.',
            duplicate,
            payload,
          });
          return;
        }

        await placeOrder(payload, false);
        return;
      }

      if (bulkDeviceField && !basePayload[bulkDeviceField]) {
        toast.error('Device value required', {
          description: `Enter a ${bulkLabel} or use the bulk order field.`,
        });
        return;
      }

      const payload = basePayload;
      const duplicate = await checkDuplicate(payload);
      if (duplicate) {
        setDuplicateDialog({
          message: 'This device is still being processed.',
          duplicate,
          payload,
        });
        return;
      }

      await placeOrder(payload, false);
    } finally {
      setLoading(false);
    }
  }

  async function confirmBulkOrder() {
    if (!bulkConfirm) return;
    setLoading(true);
    try {
      const totalCost = bulkConfirm.lines.length * unitPrice;
      toast.message(`Submitting ${bulkConfirm.lines.length} orders…`, {
        description: `Total charge: $${totalCost.toFixed(2)}`,
      });

      await processBulkQueue({
        lines: bulkConfirm.lines,
        basePayload: bulkConfirm.basePayload,
        bulkField: bulkConfirm.bulkField,
        index: 0,
        succeeded: [],
      });
    } finally {
      setLoading(false);
    }
  }

  async function confirmDuplicateContinue() {
    if (!duplicateDialog) return;
    setLoading(true);
    try {
      if (duplicateDialog.bulkResume) {
        await processBulkQueue(duplicateDialog.bulkResume, true);
        setDuplicateDialog(null);
        return;
      }

      const result = await placeOrder(duplicateDialog.payload, true);
      if (result.ok) setDuplicateDialog(null);
    } finally {
      setLoading(false);
    }
  }

  const bulkConfirmCount = bulkConfirm?.lines.length ?? 0;
  const bulkTotalCost =
    bulkConfirmCount > 0 ? `$${(bulkConfirmCount * unitPrice).toFixed(2)}` : '$0.00';

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6 lg:p-8">
        <ImeiOrderFields requires={requires} bulkDeviceField={bulkDeviceField} />

        {bulkQueue && (
          <p className="rounded-xl border border-line bg-paper px-4 py-3 font-mono text-xs text-ink-muted">
            Bulk progress: {bulkQueue.succeeded.length} / {bulkQueue.lines.length} submitted
          </p>
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

      <BulkOrderConfirmDialog
        open={!!bulkConfirm}
        count={bulkConfirmCount}
        deviceLabel={bulkLabel}
        totalCostLabel={bulkTotalCost}
        loading={loading}
        onReject={() => setBulkConfirm(null)}
        onConfirm={confirmBulkOrder}
      />

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
        onCancel={() => {
          if (duplicateDialog?.bulkResume) {
            finishBulkQueue(duplicateDialog.bulkResume);
          }
          setDuplicateDialog(null);
        }}
        onContinue={confirmDuplicateContinue}
      />
    </>
  );
}
