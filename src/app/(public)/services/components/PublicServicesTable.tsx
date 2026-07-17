'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight, Info } from '@phosphor-icons/react/dist/ssr'
import { formatUSD } from '@/lib/format'
import { CatalogTableToolbar } from '@/components/admin/CatalogTableToolbar'
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination'
import {
  ServiceDetailsModal,
  type ServiceDetails,
} from '@/components/services/ServiceDetailsModal'

export type PublicServiceRow = {
  id: string
  type: 'imei' | 'server'
  title: string
  deliveryTime: string | null
  price: number
  groupId?: string
  groupTitle?: string
  description?: string | null
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
  const [details, setDetails] = React.useState<ServiceDetails | null>(null)

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

  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(filtered, [q, groupFilter], pageSize)

  function openDetails(r: PublicServiceRow) {
    setDetails({
      title: r.title,
      groupTitle: r.groupTitle,
      priceLabel: formatUSD(r.price),
      deliveryTime: r.deliveryTime,
      description: r.description,
      kindLabel: r.type === 'imei' ? 'IMEI service' : 'Server service',
    })
  }

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
                  <div className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openDetails(r)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
                    >
                      Details <Info size={12} weight="bold" />
                    </button>
                    <Link
                      href={`${orderHrefPrefix}/${r.type}/${r.id}`}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
                    >
                      Order <ArrowUpRight size={12} weight="bold" />
                    </Link>
                  </div>
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

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        totalItems={filtered.length}
        onPageChange={setPage}
      />

      <ServiceDetailsModal service={details} onClose={() => setDetails(null)} />
    </div>
  )
}
