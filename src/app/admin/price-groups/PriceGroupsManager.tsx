'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Trash, PencilSimple, ArrowRight } from '@phosphor-icons/react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import { formatPriceGroupRule, type PriceGroupAdjustmentType } from '@/lib/price-group';

type Group = {
  id: string;
  name: string;
  description: string | null;
  adjustmentType: PriceGroupAdjustmentType;
  discountPercent: number;
  fixedAdjustment: number;
  isActive: boolean;
  users: number;
  overrides: number;
};

export function PriceGroupsManager({ initial }: { initial: Group[] }) {
  const [groups, setGroups] = React.useState<Group[]>(initial);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Group | null>(null);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [adjustmentType, setAdjustmentType] = React.useState<PriceGroupAdjustmentType>('PERCENT');
  const [discountPercent, setDiscountPercent] = React.useState('10');
  const [fixedAdjustment, setFixedAdjustment] = React.useState('-5');
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(groups, [groups.length]);

  React.useEffect(() => setGroups(initial), [initial]);

  function buildPayload(overrides?: Partial<Group>) {
    const type = overrides?.adjustmentType ?? adjustmentType;
    return {
      name: (overrides?.name ?? name).trim(),
      description: (overrides?.description ?? description).trim() || null,
      adjustmentType: type,
      discountPercent: type === 'PERCENT' ? Number(overrides?.discountPercent ?? discountPercent) : 0,
      fixedAdjustment: type === 'FIXED' ? Number(overrides?.fixedAdjustment ?? fixedAdjustment) : 0,
    };
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/admin/price-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });
    const json = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to create group', { description: json.error });
      return;
    }
    const row = json.data;
    setGroups((g) => [
      ...g,
      {
        id: row.id,
        name: row.name,
        description: row.description,
        adjustmentType: row.adjustmentType,
        discountPercent: Number(row.discountPercent),
        fixedAdjustment: Number(row.fixedAdjustment ?? 0),
        isActive: row.isActive,
        users: 0,
        overrides: 0,
      },
    ]);
    setName('');
    setDescription('');
    setAdjustmentType('PERCENT');
    setDiscountPercent('10');
    setFixedAdjustment('-5');
    toast.success('User group created');
  }

  async function saveEdit(group: Group, patch: Partial<Group>) {
    const res = await fetch(`/api/admin/price-groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: patch.name ?? group.name,
        description: patch.description !== undefined ? patch.description : group.description,
        adjustmentType: patch.adjustmentType ?? group.adjustmentType,
        discountPercent: patch.discountPercent ?? group.discountPercent,
        fixedAdjustment: patch.fixedAdjustment ?? group.fixedAdjustment,
        isActive: patch.isActive ?? group.isActive,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to update', { description: json.error });
      return;
    }
    const row = json.data;
    setGroups((g) =>
      g.map((x) =>
        x.id === group.id
          ? {
              ...x,
              name: row.name,
              description: row.description,
              adjustmentType: row.adjustmentType,
              discountPercent: Number(row.discountPercent),
              fixedAdjustment: Number(row.fixedAdjustment ?? 0),
              isActive: row.isActive,
            }
          : x,
      ),
    );
    setEditing(null);
    toast.success('Group updated');
  }

  async function remove(id: string) {
    if (!confirm('Delete this user group? Members will return to retail pricing.')) return;
    const res = await fetch(`/api/admin/price-groups/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to delete', { description: json.error });
      return;
    }
    setGroups((g) => g.filter((x) => x.id !== id));
    toast.success('Group deleted');
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createGroup} className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-lg font-extrabold tracking-tight">New user group</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Example: Reseller with 10% off, or a fixed −$5 on every service. Per-service custom prices
          can be set after creating the group.
        </p>

        <AdjustmentFields
          adjustmentType={adjustmentType}
          onAdjustmentType={setAdjustmentType}
          discountPercent={discountPercent}
          onDiscountPercent={setDiscountPercent}
          fixedAdjustment={fixedAdjustment}
          onFixedAdjustment={setFixedAdjustment}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Group name"
            placeholder="Reseller, VIP, Wholesale"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={creating || name.trim().length < 2}>
          <Plus size={14} weight="bold" /> {creating ? 'Creating…' : 'Create group'}
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Pricing rule</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Overrides</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  No user groups yet.
                </td>
              </tr>
            ) : (
              pageRows.map((g) => (
                <tr key={g.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{g.name}</div>
                    {g.description && <div className="text-xs text-ink-muted">{g.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatPriceGroupRule(g)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        g.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {g.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{g.users}</td>
                  <td className="px-4 py-3">{g.overrides}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/price-groups/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                      >
                        Pricing <ArrowRight size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(g)}
                        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink hover:border-ink"
                      >
                        <PencilSimple size={12} /> Edit
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void saveEdit(g, { isActive: !g.isActive })}
                      >
                        {g.isActive ? 'Pause' : 'Resume'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void remove(g.id)}>
                        <Trash size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={groups.length}
        onPageChange={setPage}
      />

      {editing && (
        <EditGroupDialog
          group={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveEdit(editing, patch)}
        />
      )}
    </div>
  );
}

function AdjustmentFields({
  adjustmentType,
  onAdjustmentType,
  discountPercent,
  onDiscountPercent,
  fixedAdjustment,
  onFixedAdjustment,
}: {
  adjustmentType: PriceGroupAdjustmentType;
  onAdjustmentType: (v: PriceGroupAdjustmentType) => void;
  discountPercent: string;
  onDiscountPercent: (v: string) => void;
  fixedAdjustment: string;
  onFixedAdjustment: (v: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line bg-paper p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        Default pricing for all services
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAdjustmentType('PERCENT')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            adjustmentType === 'PERCENT' ? 'bg-ink text-paper' : 'border border-line text-ink/80'
          }`}
        >
          Percentage (%)
        </button>
        <button
          type="button"
          onClick={() => onAdjustmentType('FIXED')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            adjustmentType === 'FIXED' ? 'bg-ink text-paper' : 'border border-line text-ink/80'
          }`}
        >
          Fixed amount (± USD)
        </button>
      </div>
      {adjustmentType === 'PERCENT' ? (
        <Input
          label="Discount %"
          type="number"
          min={0}
          max={50}
          step={0.5}
          value={discountPercent}
          onChange={(e) => onDiscountPercent(e.target.value)}
          hint="10 = 10% off retail price"
          required
        />
      ) : (
        <Input
          label="Adjustment (USD)"
          type="number"
          step={0.01}
          value={fixedAdjustment}
          onChange={(e) => onFixedAdjustment(e.target.value)}
          hint="Negative = cheaper (e.g. -5). Positive = markup (e.g. +5)."
          required
        />
      )}
    </div>
  );
}

function EditGroupDialog({
  group,
  onClose,
  onSave,
}: {
  group: Group;
  onClose: () => void;
  onSave: (patch: Partial<Group>) => void;
}) {
  const [name, setName] = React.useState(group.name);
  const [description, setDescription] = React.useState(group.description ?? '');
  const [adjustmentType, setAdjustmentType] = React.useState<PriceGroupAdjustmentType>(group.adjustmentType);
  const [discountPercent, setDiscountPercent] = React.useState(String(group.discountPercent));
  const [fixedAdjustment, setFixedAdjustment] = React.useState(String(group.fixedAdjustment));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl">
        <h3 className="font-display text-lg font-extrabold">Edit user group</h3>
        <div className="mt-4 space-y-3">
          <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <AdjustmentFields
            adjustmentType={adjustmentType}
            onAdjustmentType={setAdjustmentType}
            discountPercent={discountPercent}
            onDiscountPercent={setDiscountPercent}
            fixedAdjustment={fixedAdjustment}
            onFixedAdjustment={setFixedAdjustment}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-xs font-bold">
            Cancel
          </button>
          <button
            type="button"
            disabled={name.trim().length < 2}
            onClick={() =>
              onSave({
                name: name.trim(),
                description: description.trim() || null,
                adjustmentType,
                discountPercent: Number(discountPercent),
                fixedAdjustment: Number(fixedAdjustment),
              })
            }
            className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-paper disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
