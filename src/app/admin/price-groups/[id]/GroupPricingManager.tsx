'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { formatUSD } from '@/lib/format';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import type { PriceRuleType } from '@/lib/price-group-rule';
import { buildRulePayload, RuleTypeFields } from '../RuleTypeFields';

type CatalogOption = { id: string; title: string; serviceCount: number };
type ServiceOption = {
  id: string;
  title: string;
  ref: string | null;
  retailPrice: number;
  catalogGroupId: string;
  catalogGroupTitle: string;
};

type CatalogRuleRow = {
  id: string;
  kind: 'imei' | 'server';
  catalogGroupId: string;
  catalogGroupTitle: string;
  serviceCount: number;
  ruleType: PriceRuleType;
  summary: string;
};

type ServiceRuleRow = {
  id: string;
  kind: 'imei' | 'server';
  serviceId: string;
  serviceTitle: string;
  serviceRef: string | null;
  catalogGroupTitle: string | null;
  retailPrice: number;
  ruleType: PriceRuleType;
  summary: string;
};

export function GroupPricingManager({
  groupId,
  groupName,
  defaultRule,
  defaultEnabled,
  imeiGroups,
  serverBoxes,
  imeiServices,
  serverServices,
  initialCatalogRules,
  initialServiceRules,
}: {
  groupId: string;
  groupName: string;
  defaultRule: string;
  defaultEnabled: boolean;
  imeiGroups: CatalogOption[];
  serverBoxes: CatalogOption[];
  imeiServices: ServiceOption[];
  serverServices: ServiceOption[];
  initialCatalogRules: CatalogRuleRow[];
  initialServiceRules: ServiceRuleRow[];
}) {
  const confirmDialog = useConfirm();
  const [catalogRules, setCatalogRules] = React.useState(initialCatalogRules);
  const [serviceRules, setServiceRules] = React.useState(initialServiceRules);

  const catalogPagination = useTablePagination(catalogRules, [catalogRules.length]);
  const servicePagination = useTablePagination(serviceRules, [serviceRules.length]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-line bg-paper-50 p-4 text-sm">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Global default ({groupName})
        </div>
        <div className="mt-1 font-semibold text-ink">
          {defaultEnabled ? defaultRule : 'No default — retail unless a rule below applies'}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Priority: per-service rule → catalog group rule → global default → retail.
        </p>
      </div>

      <CatalogRulesSection
        groupId={groupId}
        imeiGroups={imeiGroups}
        serverBoxes={serverBoxes}
        rules={catalogRules}
        setRules={setCatalogRules}
        pageRows={catalogPagination.pageRows}
        pagination={catalogPagination}
        confirmDialog={confirmDialog}
      />

      <ServiceRulesSection
        groupId={groupId}
        imeiServices={imeiServices}
        serverServices={serverServices}
        rules={serviceRules}
        setRules={setServiceRules}
        pageRows={servicePagination.pageRows}
        pagination={servicePagination}
        confirmDialog={confirmDialog}
      />
    </div>
  );
}

function CatalogRulesSection({
  groupId,
  imeiGroups,
  serverBoxes,
  rules,
  setRules,
  pageRows,
  pagination,
  confirmDialog,
}: {
  groupId: string;
  imeiGroups: CatalogOption[];
  serverBoxes: CatalogOption[];
  rules: CatalogRuleRow[];
  setRules: React.Dispatch<React.SetStateAction<CatalogRuleRow[]>>;
  pageRows: CatalogRuleRow[];
  pagination: ReturnType<typeof useTablePagination<CatalogRuleRow>>;
  confirmDialog: ReturnType<typeof useConfirm>;
}) {
  const [kind, setKind] = React.useState<'imei' | 'server'>('imei');
  const [catalogGroupId, setCatalogGroupId] = React.useState('');
  const [ruleType, setRuleType] = React.useState<PriceRuleType>('PERCENT');
  const [discountPercent, setDiscountPercent] = React.useState('10');
  const [fixedAdjustment, setFixedAdjustment] = React.useState('-5');
  const [absolutePrice, setAbsolutePrice] = React.useState('10');
  const [busy, setBusy] = React.useState(false);

  const catalog = kind === 'imei' ? imeiGroups : serverBoxes;

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!catalogGroupId) return;
    setBusy(true);
    const res = await fetch(`/api/admin/price-groups/${groupId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'CATALOG_GROUP',
        kind,
        catalogGroupId,
        ...buildRulePayload(ruleType, discountPercent, fixedAdjustment, absolutePrice),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save rule', { description: json.error });
      return;
    }
    const g = catalog.find((c) => c.id === catalogGroupId)!;
    const summary = json.data.ruleType === 'PERCENT'
      ? `${Number(json.data.discountPercent)}% off retail`
      : json.data.ruleType === 'FIXED'
        ? `${Number(json.data.fixedAdjustment) >= 0 ? '+' : ''}$${Number(json.data.fixedAdjustment).toFixed(2)}`
        : `$${Number(json.data.absolutePrice).toFixed(2)} fixed`;
    setRules((rows) => {
      const without = rows.filter((r) => !(r.kind === kind && r.catalogGroupId === catalogGroupId));
      return [
        {
          id: json.data.id,
          kind,
          catalogGroupId,
          catalogGroupTitle: g.title,
          serviceCount: g.serviceCount,
          ruleType,
          summary,
        },
        ...without,
      ];
    });
    setCatalogGroupId('');
    toast.success('Catalog group rule saved');
  }

  async function removeRule(ruleId: string) {
    const ok = await confirmDialog({
      title: 'Remove catalog rule',
      description: 'Remove this catalog group pricing rule?',
      confirmLabel: 'Remove',
      tone: 'warning',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/price-groups/${groupId}/rules/${ruleId}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to remove', { description: json.error });
      return;
    }
    setRules((rows) => rows.filter((r) => r.id !== ruleId));
    toast.success('Rule removed');
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-extrabold tracking-tight">Catalog group rules</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Apply pricing to all services in an IMEI group or server box.
        </p>
      </div>

      <form onSubmit={addRule} className="rounded-2xl border border-line bg-paper-50 p-5">
        <div className="flex flex-wrap gap-2">
          {(['imei', 'server'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setKind(k); setCatalogGroupId(''); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                kind === k ? 'bg-ink text-paper' : 'border border-line text-ink/80'
              }`}
            >
              {k === 'imei' ? 'IMEI groups' : 'Server boxes'}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Catalog group
            </span>
            <select
              value={catalogGroupId}
              onChange={(e) => setCatalogGroupId(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              required
            >
              <option value="">Select group…</option>
              {catalog.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} · {g.serviceCount} services
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <RuleTypeFields
              ruleType={ruleType}
              onRuleType={setRuleType}
              discountPercent={discountPercent}
              onDiscountPercent={setDiscountPercent}
              fixedAdjustment={fixedAdjustment}
              onFixedAdjustment={setFixedAdjustment}
              absolutePrice={absolutePrice}
              onAbsolutePrice={setAbsolutePrice}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={busy || !catalogGroupId}>
          <Plus size={14} weight="bold" /> Save catalog rule
        </Button>
      </form>

      <RulesTable
        empty="No catalog group rules yet."
        headers={['Group', 'Type', 'Services', 'Rule', '']}
        rows={pageRows.map((r) => (
          <tr key={r.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3 font-medium">{r.catalogGroupTitle}</td>
            <td className="px-4 py-3 font-mono text-xs uppercase">{r.kind}</td>
            <td className="px-4 py-3">{r.serviceCount}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.summary}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => void removeRule(r.id)} className="text-ink-muted hover:text-red-600">
                <Trash size={16} />
              </button>
            </td>
          </tr>
        ))}
        pagination={pagination}
        total={rules.length}
      />
    </section>
  );
}

function ServiceRulesSection({
  groupId,
  imeiServices,
  serverServices,
  rules,
  setRules,
  pageRows,
  pagination,
  confirmDialog,
}: {
  groupId: string;
  imeiServices: ServiceOption[];
  serverServices: ServiceOption[];
  rules: ServiceRuleRow[];
  setRules: React.Dispatch<React.SetStateAction<ServiceRuleRow[]>>;
  pageRows: ServiceRuleRow[];
  pagination: ReturnType<typeof useTablePagination<ServiceRuleRow>>;
  confirmDialog: ReturnType<typeof useConfirm>;
}) {
  const [kind, setKind] = React.useState<'imei' | 'server'>('imei');
  const [catalogFilter, setCatalogFilter] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [ruleType, setRuleType] = React.useState<PriceRuleType>('ABSOLUTE');
  const [discountPercent, setDiscountPercent] = React.useState('10');
  const [fixedAdjustment, setFixedAdjustment] = React.useState('-5');
  const [absolutePrice, setAbsolutePrice] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const catalog = kind === 'imei' ? imeiServices : serverServices;
  const catalogGroups = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of catalog) map.set(s.catalogGroupId, s.catalogGroupTitle);
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [catalog]);

  const filtered = catalogFilter
    ? catalog.filter((s) => s.catalogGroupId === catalogFilter)
    : catalog;
  const selected = catalog.find((s) => s.id === serviceId);

  React.useEffect(() => {
    setServiceId('');
    setCatalogFilter('');
    setAbsolutePrice('');
  }, [kind]);

  React.useEffect(() => {
    if (selected && !absolutePrice && ruleType === 'ABSOLUTE') {
      setAbsolutePrice(String(selected.retailPrice));
    }
  }, [selected, absolutePrice, ruleType]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return;
    setBusy(true);
    const res = await fetch(`/api/admin/price-groups/${groupId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'SERVICE',
        kind,
        serviceId,
        ...buildRulePayload(ruleType, discountPercent, fixedAdjustment, absolutePrice),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save rule', { description: json.error });
      return;
    }
    const svc = selected!;
    setRules((rows) => {
      const without = rows.filter((r) => !(r.kind === kind && r.serviceId === serviceId));
      return [
        {
          id: json.data.id,
          kind,
          serviceId,
          serviceTitle: svc.title,
          serviceRef: svc.ref,
          catalogGroupTitle: svc.catalogGroupTitle,
          retailPrice: svc.retailPrice,
          ruleType,
          summary:
            ruleType === 'PERCENT'
              ? `${discountPercent}% off retail`
              : ruleType === 'FIXED'
                ? `${Number(fixedAdjustment) >= 0 ? '+' : ''}$${Number(fixedAdjustment).toFixed(2)}`
                : `$${Number(absolutePrice).toFixed(2)} fixed`,
        },
        ...without,
      ];
    });
    setServiceId('');
    setAbsolutePrice('');
    toast.success('Service rule saved');
  }

  async function removeRule(ruleId: string) {
    const ok = await confirmDialog({
      title: 'Remove service rule',
      description: 'Remove this per-service pricing rule?',
      confirmLabel: 'Remove',
      tone: 'warning',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/price-groups/${groupId}/rules/${ruleId}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to remove', { description: json.error });
      return;
    }
    setRules((rows) => rows.filter((r) => r.id !== ruleId));
    toast.success('Rule removed');
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-extrabold tracking-tight">Per-service rules</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Override catalog and global rules for individual services (% / ± / fixed price).
        </p>
      </div>

      <form onSubmit={addRule} className="rounded-2xl border border-line bg-paper-50 p-5">
        <div className="flex flex-wrap gap-2">
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
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Filter by catalog group
            </span>
            <select
              value={catalogFilter}
              onChange={(e) => { setCatalogFilter(e.target.value); setServiceId(''); }}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            >
              <option value="">All groups</option>
              {catalogGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Service
            </span>
            <select
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                const svc = filtered.find((s) => s.id === e.target.value);
                if (svc) setAbsolutePrice(String(svc.retailPrice));
              }}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              required
            >
              <option value="">Select service…</option>
              {filtered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · retail {formatUSD(s.retailPrice)}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <RuleTypeFields
              ruleType={ruleType}
              onRuleType={setRuleType}
              discountPercent={discountPercent}
              onDiscountPercent={setDiscountPercent}
              fixedAdjustment={fixedAdjustment}
              onFixedAdjustment={setFixedAdjustment}
              absolutePrice={absolutePrice}
              onAbsolutePrice={setAbsolutePrice}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={busy || !serviceId}>
          <Plus size={14} weight="bold" /> Save service rule
        </Button>
      </form>

      <RulesTable
        empty="No per-service rules yet."
        headers={['Service', 'Catalog', 'Type', 'Retail', 'Rule', '']}
        rows={pageRows.map((r) => (
          <tr key={r.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3">
              <div className="font-medium">{r.serviceTitle}</div>
              {r.serviceRef && <div className="font-mono text-[10px] text-ink-muted">{r.serviceRef}</div>}
            </td>
            <td className="px-4 py-3 text-xs text-ink-muted">{r.catalogGroupTitle ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs uppercase">{r.kind}</td>
            <td className="px-4 py-3 text-right font-mono text-xs">{formatUSD(r.retailPrice)}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.summary}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => void removeRule(r.id)} className="text-ink-muted hover:text-red-600">
                <Trash size={16} />
              </button>
            </td>
          </tr>
        ))}
        pagination={pagination}
        total={rules.length}
      />
    </section>
  );
}

function RulesTable({
  headers,
  rows,
  empty,
  pagination,
  total,
}: {
  headers: string[];
  rows: React.ReactNode;
  empty: string;
  pagination: { currentPage: number; pageCount: number; setPage: (p: number) => void };
  total: number;
}) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              {headers.map((h) => (
                <th key={h} className={`px-4 py-3 ${h === '' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-ink-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={pagination.currentPage}
        pageCount={pagination.pageCount}
        totalItems={total}
        onPageChange={pagination.setPage}
      />
    </>
  );
}
