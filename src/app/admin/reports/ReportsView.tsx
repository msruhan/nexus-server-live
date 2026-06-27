'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import type { AnalyticsSummary } from '@/lib/analytics';
import { TablePagination, useTablePagination } from '@/components/ui/TablePagination';

const PERIODS: Array<{ value: string; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function ReportsView({ data, period }: { data: AnalyticsSummary; period: string }) {
  const router = useRouter();

  const setPeriod = (p: string) => {
    router.push(`/admin/reports?period=${p}`);
  };

  return (
    <div className="space-y-10">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">Period</span>
        <div className="flex gap-1 rounded-lg border border-line bg-paper-50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === p.value ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total revenue" value={fmtUsd(data.revenue.total)} accent />
        <Kpi
          label="Gross profit"
          value={fmtUsd(data.profit.total)}
          hint={
            data.profit.ordersWithCost > 0
              ? `${data.profit.marginPercent}% margin · ${data.profit.ordersWithCost} orders with cost`
              : 'Enable supplier cost tracking on new orders'
          }
        />
        <Kpi label="Successful orders" value={String(data.orders.success)} />
        <Kpi label="Success rate" value={`${data.orders.successRate}%`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="IMEI profit" value={fmtUsd(data.profit.imei)} />
        <Kpi label="Server profit" value={fmtUsd(data.profit.server)} />
        <Kpi label="Top-ups received" value={fmtUsd(data.topups.total)} />
        <Kpi label="Refunds" value={fmtUsd(data.refunds.total)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="IMEI revenue" value={fmtUsd(data.revenue.imei)} />
        <Kpi label="Server revenue" value={fmtUsd(data.revenue.server)} />
        <Kpi label="Total orders" value={String(data.orders.total)} />
      </div>

      {/* Revenue chart */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Revenue by day
          </h2>
          <ExportButton period={period} type="daily" label="Export CSV" />
        </div>
        <RevenueChart data={data.revenueByDay} />
      </section>

      {/* Top services */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Best-selling services
          </h2>
          <ExportButton period={period} type="services" label="Export CSV" />
        </div>
        {data.topServices.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={['Service', 'Kind', 'Orders', 'Revenue']}
            rows={data.topServices.map((s) => [
              s.title,
              s.kind.toUpperCase(),
              String(s.orders),
              fmtUsd(s.revenue),
            ])}
            rightAlignFrom={2}
          />
        )}
      </section>

      {/* Provider performance */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Provider performance
          </h2>
          <ExportButton period={period} type="providers" label="Export CSV" />
        </div>
        {data.providerPerformance.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {data.providerPerformance.map((p) => (
              <div key={p.id} className="flex items-center gap-4">
                <div className="w-40 shrink-0 truncate text-sm font-medium text-ink">{p.title}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-200">
                  <motion.div
                    className={`h-full rounded-full ${p.successRate >= 80 ? 'bg-emerald-500' : p.successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.successRate}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="w-48 shrink-0 text-right font-mono text-xs text-ink-muted">
                  {p.successRate}% · {p.success}/{p.total}
                  {p.avgDeliveryMinutes != null && ` · ~${p.avgDeliveryMinutes}m`}
                  {p.profit > 0 && ` · ${fmtUsd(p.profit)} profit`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top customers */}
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Top customers
          </h2>
          <ExportButton period={period} type="customers" label="Export CSV" />
        </div>
        {data.topCustomers.length === 0 ? (
          <Empty />
        ) : (
          <Table
            headers={['Customer', 'Email', 'Orders', 'Spend']}
            rows={data.topCustomers.map((c) => [c.name, c.email, String(c.orders), fmtUsd(c.spend)])}
            rightAlignFrom={2}
          />
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-primary-700 bg-primary-500 text-paper' : 'border-line bg-paper-50'
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          accent ? 'text-paper/70' : 'text-ink-muted'
        }`}
      >
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-black tracking-tight">{value}</div>
      {hint && (
        <div className={`mt-1 text-xs ${accent ? 'text-paper/70' : 'text-ink-muted'}`}>{hint}</div>
      )}
    </div>
  );
}

function RevenueChart({ data }: { data: Array<{ date: string; imei: number; server: number }> }) {
  if (data.length === 0) return <Empty />;

  const max = Math.max(...data.map((d) => d.imei + d.server), 1);
  const barW = Math.max(100 / data.length - 1, 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-1">
        {data.map((d) => {
          const total = d.imei + d.server;
          const h = (total / max) * 100;
          const imeiH = total === 0 ? 0 : (d.imei / total) * 100;
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ minWidth: 2 }}
              title={`${d.date}: ${fmtUsd(total)}`}
            >
              <motion.div
                className="flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5 }}
                style={{ minHeight: total > 0 ? 3 : 0 }}
              >
                <div className="bg-primary-500" style={{ height: `${imeiH}%` }} />
                <div className="bg-accent-500" style={{ height: `${100 - imeiH}%` }} />
              </motion.div>
              <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[10px] font-bold text-paper group-hover:block">
                {fmtUsd(total)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary-500" /> IMEI
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-500" /> Server
        </span>
      </div>
    </div>
  );
}

function Table({
  headers,
  rows,
  rightAlignFrom,
}: {
  headers: string[];
  rows: string[][];
  rightAlignFrom?: number;
}) {
  const { pageRows, currentPage, pageCount, setPage } = useTablePagination(rows, [rows.length]);

  return (
    <div>
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper-100 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {headers.map((h, i) => (
              <th
                key={h}
                className={`px-4 py-3 ${rightAlignFrom !== undefined && i >= rightAlignFrom ? 'text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, ri) => (
            <tr key={ri} className="border-b border-line last:border-0">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 ${
                    rightAlignFrom !== undefined && ci >= rightAlignFrom
                      ? 'text-right font-mono'
                      : ci === 0
                        ? 'font-medium text-ink'
                        : 'text-ink-muted'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <TablePagination
      currentPage={currentPage}
      pageCount={pageCount}
      totalItems={rows.length}
      onPageChange={setPage}
    />
    </div>
  );
}

function ExportButton({ period, type, label }: { period: string; type: string; label: string }) {
  return (
    <a
      href={`/api/admin/reports/export?period=${period}&type=${type}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-paper-200"
    >
      <DownloadSimple size={13} weight="bold" /> {label}
    </a>
  );
}

function Empty() {
  return <p className="py-8 text-center font-serif italic text-ink-muted">No data for this period.</p>;
}
