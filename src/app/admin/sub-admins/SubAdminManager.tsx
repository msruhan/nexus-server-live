'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';
import type { PermissionKey } from '@/lib/sub-admin';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type PermissionRecord = Record<string, unknown>;

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: PermissionRecord | null;
};

type EligibleUser = { id: string; name: string; email: string };

type PermGroup = {
  category: string;
  permissions: Array<{ key: string; label: string }>;
};

export function SubAdminManager({
  subAdmins: initial,
  eligibleUsers,
  permissionGroups,
}: {
  subAdmins: SubAdmin[];
  eligibleUsers: EligibleUser[];
  permissionGroups: PermGroup[];
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [subAdmins, setSubAdmins] = React.useState(initial);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(subAdmins, [subAdmins.length]);
  const [promoteUserId, setPromoteUserId] = React.useState('');
  const [promoting, setPromoting] = React.useState(false);

  async function promote() {
    if (!promoteUserId) return;
    setPromoting(true);
    const res = await fetch('/api/admin/sub-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: promoteUserId }),
    });
    const json = await res.json().catch(() => ({}));
    setPromoting(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to promote', { description: json.error });
      return;
    }
    toast.success('User promoted to sub-admin');
    setPromoteUserId('');
    router.refresh();
  }

  async function revoke(id: string) {
    const ok = await confirmDialog({
      title: 'Revoke sub-admin',
      description: 'Revoke sub-admin access? User will be demoted back to regular USER.',
      confirmLabel: 'Revoke',
      tone: 'warning',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/sub-admins/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast.error('Failed to revoke', { description: json.error });
      return;
    }
    toast.success('Sub-admin access revoked');
    setSubAdmins((s) => s.filter((u) => u.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Promote form */}
      <div className="rounded-2xl border border-line bg-paper-50 p-5">
        <h3 className="font-display text-lg font-extrabold tracking-tight">Promote a user</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Select an active user to grant sub-admin access. You can then assign specific permissions.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              User
            </label>
            <select
              value={promoteUserId}
              onChange={(e) => setPromoteUserId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper-50 px-3 py-2.5 text-sm"
            >
              <option value="">— select a user —</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => void promote()} disabled={promoting || !promoteUserId}>
            <Plus size={14} weight="bold" />
            {promoting ? 'Promoting…' : 'Promote to sub-admin'}
          </Button>
        </div>
      </div>

      {/* Sub-admin list */}
      <div className="overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-ink-muted">
                  No sub-admins yet. Promote a user above.
                </td>
              </tr>
            ) : (
              pageRows.flatMap((u) => {
                const expanded = expandedId === u.id;
                return [
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>
                        {u.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedId(expanded ? null : u.id)}
                        >
                          <ShieldCheck size={14} />
                          {expanded ? 'Close' : 'Permissions'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void revoke(u.id)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>,
                  expanded ? (
                    <tr key={`${u.id}-perms`} className="border-b border-line bg-paper-100/50">
                      <td colSpan={4} className="px-4 py-4">
                        <PermissionEditor
                          userId={u.id}
                          permissions={u.permissions}
                          groups={permissionGroups}
                          onSaved={() => router.refresh()}
                        />
                      </td>
                    </tr>
                  ) : null,
                ].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={subAdmins.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function PermissionEditor({
  userId,
  permissions,
  groups,
  onSaved,
}: {
  userId: string;
  permissions: PermissionRecord | null;
  groups: PermGroup[];
  onSaved: () => void;
}) {
  const [state, setState] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      for (const p of g.permissions) {
        init[p.key] = permissions?.[p.key] === true;
      }
    }
    return init;
  });
  const [saving, setSaving] = React.useState(false);

  function toggle(key: string) {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }

  function selectAll() {
    setState((s) => {
      const next = { ...s };
      for (const k of Object.keys(next)) next[k] = true;
      return next;
    });
  }

  function deselectAll() {
    setState((s) => {
      const next = { ...s };
      for (const k of Object.keys(next)) next[k] = false;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/sub-admins/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error('Failed to save permissions', { description: json.error });
      return;
    }
    toast.success('Permissions updated');
    onSaved();
  }

  const totalEnabled = Object.values(state).filter(Boolean).length;
  const totalPerms = Object.keys(state).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-muted">
          {totalEnabled} / {totalPerms} permissions enabled
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-semibold text-primary-700 hover:underline"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs font-semibold text-ink-muted hover:underline"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.category} className="rounded-xl border border-line bg-paper p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              {g.category}
            </div>
            <div className="space-y-1.5">
              {g.permissions.map((p) => (
                <label
                  key={p.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-paper-100 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={state[p.key] ?? false}
                    onChange={() => toggle(p.key)}
                    className="h-4 w-4 rounded border-line text-primary-500"
                  />
                  <span className="text-ink">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save permissions'}
        </Button>
      </div>
    </div>
  );
}
