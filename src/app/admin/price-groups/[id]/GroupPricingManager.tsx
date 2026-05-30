'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatUSD } from '@/lib/format';

type ServiceOption = {
  id: string;
  title: string;
  ref: string | null;
  retailPrice: number;
};

type OverrideRow = {
  id: string;
  kind: 'imei' | 'server';
  serviceId: string;
  serviceTitle: string;
  serviceRef: string | null;
  retailPrice: number;
  price: number;
};

export function GroupPricingManager({
  groupId,
  groupName,
  defaultRule,
  imeiServices,
  serverServices,
  initialOverrides,
}: {
  groupId: string;
  groupName: string;
  defaultRule: string;
  imeiServices: ServiceOption[];
  serverServices: ServiceOption[];
  initialOverrides: OverrideRow[];
}) {
  const [overrides, setOverrides] = React.useState(initialOverrides);
  const [kind, setKind] = React.useState<'imei' | 'server'>('imei');
  const [serviceId, setServiceId] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const catalog = kind === 'imei' ? imeiServices : serverServices;
  const selected = catalog.find((s) => s.id === serviceId);

  React.useEffect(() => {
    setServiceId('');
    setPrice('');
  }, [kind]);

  React.useEffect(() => {
    if (selected && !price) setPrice(String(selected.retailPrice));
  }, [selected, price]);

  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !price) return;
    setBusy(true);
    const res = await fetch(`/api/admin/price-groups/${groupId}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, serviceId, price: Number(price) }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save override', { description: json.error });
      return;
    }
    const svc = selected!;
    setOverrides((rows) => {
      const without = rows.filter((r) => !(r.kind === kind && r.serviceId === serviceId));
      return [
        {
          id: json.data.id,
          kind,
          serviceId,
          serviceTitle: svc.title,
          serviceRef: svc.ref,
          retailPrice: svc.retailPrice,
          price: Number(price),
        },
        ...without,
      ];
    });
    setServiceId('');
    setPrice('');
    toast.success('Custom price saved');
  }

  async function removeOverride(overrideId: string) {
    if (!confirm('Remove this custom price? The group default rule will apply again.')) return;
    const res = await fetch(`/api/admin/price-groups/${groupId}/overrides/${overrideId}`, {
      method: 'DELETE',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to remove', { description: json.error });
      return;
    }
    setOverrides((rows) => rows.filter((r) => r.id !== overrideId));
    toast.success('Override removed');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-paper-50 p-4 text-sm">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Group default ({groupName})
        </div>
        <div className="mt-1 font-semibold text-ink">{defaultRule}</div>
        <p className="mt-2 text-xs text-ink-muted">
          Custom prices below override the default for specific services only.
        </p>
      </div>

      <form onSubmit={addOverride} className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-lg font-extrabold tracking-tight">Per-service price</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Set an exact USD price for one service (flexible — ignores % or ± rule for that row).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['imei', 'server'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                kind === k ? 'bg-ink text-paper' : 'border border-line text-ink/80'
              }`}
            >
              {k === 'imei' ? 'IMEI' : 'Server'}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Service
            </span>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const svc = catalog.find((s) => s.id === e.target.value);
                if (svc) setPrice(String(svc.retailPrice));
              }}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              required
            >
              <option value="">Select service…</option>
              {catalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · retail {formatUSD(s.retailPrice)}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Group price (USD)"
            type="number"
            min={0.01}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="mt-4" disabled={busy || !serviceId}>
          <Plus size={14} weight="bold" /> Save custom price
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Retail</th>
              <th className="px-4 py-3 text-right">Group price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  No per-service overrides — the group default applies to all catalog items.
                </td>
              </tr>
            ) : (
              overrides.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.serviceTitle}</div>
                    {o.serviceRef && (
                      <div className="font-mono text-[10px] text-ink-muted">{o.serviceRef}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 uppercase font-mono text-xs">{o.kind}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(o.retailPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatUSD(o.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void removeOverride(o.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700"
                    >
                      <Trash size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
