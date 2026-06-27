import { prisma } from '@/lib/db';
import { ServiceStatus } from '@/lib/constants';
import { formatUSD } from '@/lib/format';
import type { CatalogServiceRow, ServiceCatalogContent } from '@/lib/cms-types';
import {
  type CatalogPickService,
  serviceToCatalogRow,
} from '@/lib/catalog-services-shared';

export type { CatalogPickService } from '@/lib/catalog-services-shared';
export { serviceToCatalogRow } from '@/lib/catalog-services-shared';

function plainText(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function listCatalogPickServices(): Promise<{
  imei: CatalogPickService[];
  server: CatalogPickService[];
}> {
  const [imeiGroups, serverBoxes] = await Promise.all([
    prisma.imeiServiceGroup.findMany({
      where: { marketplaceVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        services: {
          where: { status: ServiceStatus.ACTIVE },
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            deliveryTime: true,
          },
        },
      },
    }),
    prisma.serverServiceBox.findMany({
      where: { marketplaceVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        services: {
          where: { status: ServiceStatus.ACTIVE },
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            deliveryTime: true,
          },
        },
      },
    }),
  ]);

  const imei: CatalogPickService[] = [];
  for (const group of imeiGroups) {
    for (const s of group.services) {
      imei.push({
        id: s.id,
        kind: 'imei',
        title: s.title,
        description: s.description,
        price: Number(s.price),
        priceLabel: formatUSD(s.price),
        deliveryTime: s.deliveryTime,
        groupId: group.id,
        groupTitle: group.title,
        orderHref: `/marketplace/imei/${group.id}?service=${s.id}`,
      });
    }
  }

  const server: CatalogPickService[] = [];
  for (const box of serverBoxes) {
    for (const s of box.services) {
      server.push({
        id: s.id,
        kind: 'server',
        title: s.title,
        description: s.description,
        price: Number(s.price),
        priceLabel: formatUSD(s.price),
        deliveryTime: s.deliveryTime,
        groupId: box.id,
        groupTitle: box.title,
        orderHref: `/marketplace/server/${box.id}?service=${s.id}`,
      });
    }
  }

  return { imei, server };
}

type LiveService = {
  id: string;
  title: string;
  description: string | null;
  price: { toString(): string };
  deliveryTime: string | null;
  groupId: string;
  groupTitle: string;
};

async function loadLiveServices(ids: string[], kind: 'imei' | 'server'): Promise<Map<string, LiveService>> {
  if (ids.length === 0) return new Map();

  if (kind === 'imei') {
    const rows = await prisma.imeiService.findMany({
      where: {
        id: { in: ids },
        status: ServiceStatus.ACTIVE,
        group: { marketplaceVisible: true },
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        deliveryTime: true,
        group: { select: { id: true, title: true } },
      },
    });
    return new Map(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          title: r.title,
          description: r.description,
          price: r.price,
          deliveryTime: r.deliveryTime,
          groupId: r.group.id,
          groupTitle: r.group.title,
        },
      ]),
    );
  }

  const rows = await prisma.serverService.findMany({
    where: {
      id: { in: ids },
      status: ServiceStatus.ACTIVE,
      box: { marketplaceVisible: true },
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      deliveryTime: true,
      box: { select: { id: true, title: true } },
    },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        title: r.title,
        description: r.description,
        price: r.price,
        deliveryTime: r.deliveryTime,
        groupId: r.box.id,
        groupTitle: r.box.title,
      },
    ]),
  );
}

async function resolveLinkedRows(
  rows: CatalogServiceRow[] | undefined,
  kind: 'imei' | 'server',
): Promise<CatalogServiceRow[]> {
  const input = rows ?? [];
  const linked = input.filter((r) => r.serviceId && (r.kind ?? kind) === kind);
  const ids = linked.map((r) => r.serviceId!).filter(Boolean);
  const live = await loadLiveServices(ids, kind);

  const resolved: CatalogServiceRow[] = [];
  for (const row of input) {
    if (!row.serviceId) {
      resolved.push(row);
      continue;
    }
    const rowKind = row.kind ?? kind;
    if (rowKind !== kind) {
      resolved.push(row);
      continue;
    }
    const service = live.get(row.serviceId);
    if (!service) continue;

    const meta =
      plainText(service.description) ||
      `${service.groupTitle} · marketplace service`;

    resolved.push({
      ...row,
      title: service.title,
      meta: meta.length > 120 ? `${meta.slice(0, 117)}…` : meta,
      delivery: service.deliveryTime?.trim() || row.delivery || '—',
      price: formatUSD(service.price.toString()),
      orderHref: `/marketplace/${kind}/${service.groupId}?service=${service.id}`,
      serviceId: service.id,
      kind,
    });
  }
  return resolved;
}

/** Merge live marketplace data into catalog rows that reference a service id. */
export async function resolveLiveCatalogContent(
  content: ServiceCatalogContent,
): Promise<ServiceCatalogContent> {
  const [imeiServices, serverServices] = await Promise.all([
    resolveLinkedRows(content.imeiServices, 'imei'),
    resolveLinkedRows(content.serverServices, 'server'),
  ]);
  return { ...content, imeiServices, serverServices };
}

export async function refreshLinkedCatalogRows(
  rows: CatalogServiceRow[],
  kind: 'imei' | 'server',
): Promise<CatalogServiceRow[]> {
  const { imei, server } = await listCatalogPickServices();
  const pool = kind === 'imei' ? imei : server;
  const ids = rows.filter((r) => r.serviceId).map((r) => r.serviceId!);
  const live = await loadLiveServices(ids, kind);

  return rows.map((row, index) => {
    if (!row.serviceId) return row;
    const service = live.get(row.serviceId) ?? pool.find((s) => s.id === row.serviceId);
    if (!service) return row;

    const pick: CatalogPickService =
      'priceLabel' in service
        ? service
        : {
            id: service.id,
            kind,
            title: service.title,
            description: service.description,
            price: Number(service.price.toString()),
            priceLabel: formatUSD(service.price.toString()),
            deliveryTime: service.deliveryTime,
            groupId: service.groupId,
            groupTitle: service.groupTitle,
            orderHref: `/marketplace/${kind}/${service.groupId}?service=${service.id}`,
          };

    return serviceToCatalogRow(pick, index, {
      ref: row.ref,
      popular: row.popular,
      tag: row.tag,
    });
  });
}
