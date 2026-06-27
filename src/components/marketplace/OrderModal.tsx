'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpRight, X } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ImeiOrderFields, type ImeiRequires } from '@/components/orders/ImeiOrderFields';
import { ServerOrderFields } from '@/components/orders/ServerOrderFields';
import type { ServerFieldDef } from '@/lib/server-fields';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export type ModalService =
  | {
      kind: 'imei';
      id: string;
      title: string;
      priceLabel: string;
      deliveryTime: string | null;
      requires: ImeiRequires;
    }
  | {
      kind: 'server';
      id: string;
      title: string;
      priceLabel: string;
      deliveryTime: string | null;
      fieldDefs: ServerFieldDef[];
    };

export function OrderModal({
  service,
  isAuthenticated,
  loginNext,
  guestGateways,
  onClose,
}: {
  service: ModalService | null;
  isAuthenticated: boolean;
  loginNext: string;
  guestGateways: Array<{ id: string; label: string }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [loading, setLoading] = React.useState(false);
  const [serverValues, setServerValues] = React.useState<Record<string, string>>({});
  const [guestEmail, setGuestEmail] = React.useState('');
  const [guestGateway, setGuestGateway] = React.useState(guestGateways[0]?.id ?? '');

  React.useEffect(() => {
    setServerValues({});
    setGuestEmail('');
    setGuestGateway(guestGateways[0]?.id ?? '');
    setLoading(false);
  }, [service?.id, guestGateways]);

  if (!service) return null;

  async function placeImeiOrder(
    payload: Record<string, string>,
    acknowledgeDuplicate: boolean,
  ): Promise<boolean> {
    const res = await fetch('/api/imei/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, acknowledgeDuplicate }),
    });
    const j = await res.json().catch(() => ({}));

    if (res.status === 409 && j.code === 'DUPLICATE_ORDER' && !acknowledgeDuplicate) {
      const proceed = await confirmDialog({
        title: 'Duplicate order',
        description: `${j.error ?? 'This device already has an active order.'}\n\nContinue anyway?`,
        confirmLabel: 'Continue',
        tone: 'warning',
      });
      if (proceed) return placeImeiOrder(payload, true);
      return false;
    }
    if (!res.ok || !j.success) {
      toast.error('Order failed', { description: j.error ?? 'Please try again.' });
      return false;
    }
    toast.success('Docket submitted', { description: j.data?.orderCode });
    router.push(`/user/orders/${j.data?.id}?type=imei`);
    router.refresh();
    return true;
  }

  async function onImeiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload: Record<string, string> = { serviceId: service!.id };
      fd.forEach((v, k) => {
        const s = String(v).trim();
        if (s) payload[k] = s;
      });

      const params = new URLSearchParams({ serviceId: service!.id });
      if (payload.imei) params.set('imei', payload.imei);
      if (payload.serialNumber) params.set('serialNumber', payload.serialNumber);

      const checkRes = await fetch(`/api/imei/orders/check-duplicate?${params.toString()}`);
      const checkJson = await checkRes.json().catch(() => ({}));
      if (checkRes.ok && checkJson.success && checkJson.data?.duplicate && checkJson.data?.existing) {
        const proceed = await confirmDialog({
          title: 'Duplicate order',
          description: `${checkJson.data.message ?? 'This device already has an active order.'}\n\nContinue anyway?`,
          confirmLabel: 'Continue',
          tone: 'warning',
        });
        if (!proceed) return;
        await placeImeiOrder(payload, true);
        return;
      }
      await placeImeiOrder(payload, false);
    } finally {
      setLoading(false);
    }
  }

  async function onServerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/imei/server-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service!.id, requiredFields: serverValues }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        toast.error('Order failed', { description: j.error ?? 'Please try again.' });
        return;
      }
      toast.success('Docket submitted', { description: j.data?.orderCode });
      router.push(`/user/orders/${j.data?.id}?type=server`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onGuestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const activeService = service;
    if (!activeService) return;
    if (!guestEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!guestGateway) {
      toast.error('Please choose a payment gateway');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const data: Record<string, string> = {};
      fd.forEach((v, k) => {
        const s = String(v).trim();
        if (s) data[k] = s;
      });

      if (activeService.kind === 'server') {
        Object.assign(data, serverValues);
      }

      const res = await fetch('/api/public/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: activeService.kind,
          serviceId: activeService.id,
          email: guestEmail.trim(),
          gateway: guestGateway,
          data,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        toast.error('Unable to start checkout', { description: j.error ?? 'Please try again.' });
        return;
      }
      const redirectUrl: string | undefined = j.redirectUrl ?? j.payment?.url;
      if (!redirectUrl) {
        toast.error('Gateway redirect URL is missing');
        return;
      }
      toast.success('Redirecting to payment gateway…');
      window.location.href = redirectUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-paper shadow-card-hover">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper-100 px-5 py-4">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              {service.kind === 'imei' ? 'IMEI order' : 'Server order'}
            </span>
            <h3 className="mt-1 truncate font-display text-lg font-extrabold tracking-tight text-ink">
              {service.title}
            </h3>
          </div>
          <button
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
            {service.deliveryTime && (
              <span className="font-mono text-xs text-ink-muted">Delivery · {service.deliveryTime}</span>
            )}
          </div>

          {!isAuthenticated ? (
            <form onSubmit={onGuestSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
              <div className="rounded-xl border border-line bg-paper p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  Guest checkout
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Place order without login and pay directly via gateway.
                </p>
              </div>
              <Input
                label="Email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  Payment gateway
                </label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
                  value={guestGateway}
                  onChange={(e) => setGuestGateway(e.target.value)}
                  required
                >
                  {guestGateways.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              {service.kind === 'imei' ? (
                <ImeiOrderFields requires={service.requires} />
              ) : service.fieldDefs.length === 0 ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-serif italic text-amber-900">
                  This service has no order fields configured. Contact admin.
                </p>
              ) : (
                <ServerOrderFields
                  fieldDefs={service.fieldDefs}
                  values={serverValues}
                  onChange={(key, value) => setServerValues((v) => ({ ...v, [key]: value }))}
                />
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <Button type="submit" disabled={loading || guestGateways.length === 0}>
                  {loading ? 'Redirecting…' : 'Pay & submit order'}
                  {!loading && <ArrowUpRight weight="bold" size={14} />}
                </Button>
                <Link
                  href={`/login?next=${encodeURIComponent(loginNext)}`}
                  className="text-sm text-ink-muted hover:text-ink"
                >
                  Prefer account login?
                </Link>
              </div>
            </form>
          ) : service.kind === 'imei' ? (
            <form onSubmit={onImeiSubmit} className="space-y-5">
              <ImeiOrderFields requires={service.requires} />
              <div className="flex items-center gap-3 border-t border-line pt-5">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit docket'}
                  {!loading && <ArrowUpRight weight="bold" size={14} />}
                </Button>
                <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
                  Cancel
                </button>
              </div>
              <p className="font-serif text-xs italic text-ink-muted">
                Your wallet is charged before the order is sent upstream. Auto-refund if rejected.
              </p>
            </form>
          ) : service.fieldDefs.length === 0 ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-serif italic text-amber-900">
              This service has no order fields configured. Contact admin.
            </p>
          ) : (
            <form onSubmit={onServerSubmit} className="space-y-5">
              <ServerOrderFields
                fieldDefs={service.fieldDefs}
                values={serverValues}
                onChange={(key, value) => setServerValues((v) => ({ ...v, [key]: value }))}
              />
              <div className="flex items-center gap-3 border-t border-line pt-5">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit docket'}
                  {!loading && <ArrowUpRight weight="bold" size={14} />}
                </Button>
                <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
                  Cancel
                </button>
              </div>
              <p className="font-serif text-xs italic text-ink-muted">
                Your wallet is charged before the order is sent upstream. Auto-refund if rejected.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
