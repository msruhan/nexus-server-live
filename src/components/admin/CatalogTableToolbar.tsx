'use client';

import * as React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

export type CatalogGroupOption = {
  id: string;
  title: string;
};

export function CatalogTableToolbar({
  search,
  onSearchChange,
  groupFilter,
  onGroupFilterChange,
  groups,
  resultCount,
  groupFilterLabel = 'All groups',
}: {
  search: string;
  onSearchChange: (value: string) => void;
  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  groups: CatalogGroupOption[];
  resultCount: number;
  groupFilterLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-end gap-3">
        <label className="relative block min-w-[200px] flex-1 max-w-md">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Search
          </span>
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-[2.15rem] text-ink-muted"
          />
          <input
            type="search"
            placeholder="Title, ref, or group…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-50 py-2 pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block min-w-[180px]">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Group
          </span>
          <select
            value={groupFilter}
            onChange={(e) => onGroupFilterChange(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm focus:border-ink focus:outline-none"
          >
            <option value="">{groupFilterLabel}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {resultCount} shown
      </div>
    </div>
  );
}

export function filterCatalogRows<
  T extends { title: string; ref: string; group: string; groupId: string },
>(rows: T[], search: string, groupId: string, refPrefix: string): T[] {
  let list = rows;
  if (groupId) list = list.filter((r) => r.groupId === groupId);
  const query = search.trim().toLowerCase();
  if (!query) return list;
  return list.filter((r) => {
    const haystack = [
      r.title,
      r.group,
      r.ref,
      `${refPrefix}.${r.ref}`,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}
