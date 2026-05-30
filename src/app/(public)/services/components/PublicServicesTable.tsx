'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr'
import { formatUSD } from '@/lib/format'
import { CatalogTableToolbar } from '@/components/admin/CatalogTableToolbar'

export type PublicServiceRow = {
  id: string
  type: 'imei' | 'server'
  title: string
  deliveryTime: string | null
  price: number
  groupId?: string
  groupTitle?: string
}

export function PublicServicesTable({
  rows,
  pageSize = 25,
  orderHrefPrefix = '/user/orders/new',
}: {
  rows: PublicServiceRow[]
  pageSize?: number
  orderHrefPrefix?: string
}) {
  const [q, setQ] = React.useState('')
  const [groupFilter, setGroupFilter] = React.useState('')
  const [page, setPage] = React.useState(1)

  const groups = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.groupId && r.groupTitle) map.set(r.groupId, r.groupTitle)
    }
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [rows])

  const filtered = React.useMemo(() => {
    let list = rows
    if (groupFilter) list = list.filter((r) => r.groupId === groupFilter)
    const query = q.trim().toLowerCase()
    if (!query) return list
    return list.filter((r) => {
      const haystack = [r.title, r.groupTitle].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [rows, q, groupFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  React.useEffect(() => {
    setPage(1)
  }, [q, groupFilter])

  return (
    <div className="mt-10">
      <CatalogTableToolbar
        search={q}
        onSearchChange={setQ}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groups={groups}
        resultCount={filtered.length}
        groupFilterLabel="All groups"
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-paper-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              <th className="px-4 py-3">Service name</th>
              <th className="hidden px-4 py-3 md:table-cell">Delivery</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-100">
                <td className="px-4 py-3">
                  <div className="font-display font-bold tracking-tight text-ink">{r.title}</div>
                  {r.groupTitle && (
                    <div className="mt-0.5 font-mono text-[10px] text-ink-muted">{r.groupTitle}</div>
                  )}
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs text-ink-muted md:table-cell">
                  {r.deliveryTime?.trim() ? r.deliveryTime : '—'}
                </td>
                <td className="px-4 py-3 text-right font-display text-base font-extrabold tracking-tight text-ink">
                  {formatUSD(r.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${orderHrefPrefix}/${r.type}/${r.id}`}
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
                  >
                    Order <ArrowUpRight size={12} weight="bold" />
                  </Link>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center font-serif italic text-ink-muted">
                  No services match your search or group filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Page {currentPage} / {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink hover:border-ink disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink hover:border-ink disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
