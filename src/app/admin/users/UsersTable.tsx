'use client';

import * as React from 'react';
import { formatDate } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { UserActivationStatus } from './UserActivationStatus';
import { UserPricingPreview } from './UserPricingPreview';
import { UserWalletCredit } from './UserWalletCredit';
import { UserGroupSelect, type UserGroupOption } from './UserGroupSelect';
import { CatalogTableToolbar } from '@/components/admin/CatalogTableToolbar';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  wallet: number;
  orders: number;
  joined: Date;
  active: boolean;
  emailVerifiedAt: Date | null;
  emailVerificationToken: string | null;
  groupId: string;
  group: string;
};

export function UsersTable({
  rows,
  groups,
}: {
  rows: Row[];
  groups: UserGroupOption[];
}) {
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    let list = rows;
    if (groupFilter === '__retail__') {
      list = list.filter((r) => !r.groupId);
    } else if (groupFilter) {
      list = list.filter((r) => r.groupId === groupFilter);
    }
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((r) => {
      const haystack = [r.name, r.email, r.group, r.role].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search, groupFilter]);

  const groupOptions = [
    { id: '__retail__', title: 'Retail only (no group)' },
    ...groups.map((g) => ({ id: g.id, title: g.name })),
  ];

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [
    search,
    groupFilter,
  ]);

  return (
    <>
      <CatalogTableToolbar
        search={search}
        onSearchChange={setSearch}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groups={groupOptions}
        resultCount={filtered.length}
        groupFilterLabel="All groups"
      />

      <div className="overflow-hidden rounded-xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">User group</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Wallet</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">
                  No users match your search or group filter.
                </td>
              </tr>
            )}
            {pageRows.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <UserGroupSelect userId={u.id} value={u.groupId || null} groups={groups} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={u.role} />
                </td>
                <td className="px-4 py-3 text-right">
                  <UserWalletCredit
                    userId={u.id}
                    userName={u.name}
                    currentBalance={u.wallet}
                  />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{u.orders}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{formatDate(u.joined)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    <UserPricingPreview
                      userId={u.id}
                      userName={u.name}
                      userEmail={u.email}
                      groupName={u.group}
                    />
                    <UserActivationStatus
                      userId={u.id}
                      active={u.active}
                      emailVerifiedAt={u.emailVerifiedAt}
                      emailVerificationToken={u.emailVerificationToken}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={filtered.length}
        onPageChange={setPage}
      />
    </>
  );
}
