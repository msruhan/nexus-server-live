import type { CatalogServiceRow } from '@/lib/cms-types';

export type CatalogPickService = {
  id: string;
  kind: 'imei' | 'server';
  title: string;
  description: string | null;
  price: number;
  priceLabel: string;
  deliveryTime: string | null;
  groupId: string;
  groupTitle: string;
  orderHref: string;
};

function plainText(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function catalogRef(kind: 'imei' | 'server', index: number): string {
  const prefix = kind === 'imei' ? 'A' : 'B';
  return `${prefix}.${String(index + 1).padStart(3, '0')}`;
}

export function serviceToCatalogRow(
  service: CatalogPickService,
  index: number,
  overrides?: Partial<CatalogServiceRow>,
): CatalogServiceRow {
  const meta =
    plainText(service.description) ||
    `${service.groupTitle} · marketplace service`;

  return {
    ref: catalogRef(service.kind, index),
    title: service.title,
    meta: meta.length > 120 ? `${meta.slice(0, 117)}…` : meta,
    delivery: service.deliveryTime?.trim() || '—',
    price: service.priceLabel,
    orderHref: service.orderHref,
    serviceId: service.id,
    kind: service.kind,
    ...overrides,
  };
}

export function refreshRowsFromPickList(
  rows: CatalogServiceRow[],
  pool: CatalogPickService[],
  kind: 'imei' | 'server',
): CatalogServiceRow[] {
  const byId = new Map(pool.map((s) => [s.id, s]));
  return rows.map((row, index) => {
    if (!row.serviceId) return row;
    const service = byId.get(row.serviceId);
    if (!service || service.kind !== kind) return row;
    return serviceToCatalogRow(service, index, {
      ref: row.ref,
      popular: row.popular,
      tag: row.tag,
    });
  });
}
