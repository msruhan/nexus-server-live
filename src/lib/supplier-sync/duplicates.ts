import { prisma } from '@/lib/db';

export type DuplicateGroup = {
  kind: 'imei' | 'server';
  reason: 'toolId' | 'title';
  key: string;
  services: Array<{
    id: string;
    title: string;
    toolId: string | null;
    apiId: string | null;
    apiTitle: string;
    status: string;
    price: string;
  }>;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

type ServiceRow = DuplicateGroup['services'][0];

function pushToolIdGroups(
  items: Array<{
    id: string;
    title: string;
    toolId: string | null;
    apiId: string | null;
    status: string;
    price: { toString(): string };
    api: { title: string } | null;
  }>,
  kind: 'imei' | 'server',
  groups: DuplicateGroup[],
) {
  const map = new Map<string, ServiceRow[]>();
  for (const s of items) {
    if (!s.toolId?.trim()) continue;
    const key = s.toolId.trim().toLowerCase();
    const row: ServiceRow = {
      id: s.id,
      title: s.title,
      toolId: s.toolId,
      apiId: s.apiId,
      apiTitle: s.api?.title ?? 'Manual',
      status: s.status,
      price: s.price.toString(),
    };
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  for (const [key, services] of map) {
    if (services.length < 2) continue;
    groups.push({ kind, reason: 'toolId', key, services });
  }
}

function pushTitleGroups(
  items: Array<{
    id: string;
    title: string;
    toolId: string | null;
    apiId: string | null;
    status: string;
    price: { toString(): string };
    api: { title: string } | null;
  }>,
  kind: 'imei' | 'server',
  groups: DuplicateGroup[],
) {
  const map = new Map<string, ServiceRow[]>();
  for (const s of items) {
    const key = normalizeTitle(s.title);
    if (key.length < 4) continue;
    const row: ServiceRow = {
      id: s.id,
      title: s.title,
      toolId: s.toolId,
      apiId: s.apiId,
      apiTitle: s.api?.title ?? 'Manual',
      status: s.status,
      price: s.price.toString(),
    };
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  for (const [key, services] of map) {
    if (services.length < 2) continue;
    groups.push({ kind, reason: 'title', key, services });
  }
}

export async function findDuplicateServices(): Promise<DuplicateGroup[]> {
  const groups: DuplicateGroup[] = [];

  const [imei, server] = await Promise.all([
    prisma.imeiService.findMany({
      select: {
        id: true,
        title: true,
        toolId: true,
        apiId: true,
        status: true,
        price: true,
        api: { select: { title: true } },
      },
    }),
    prisma.serverService.findMany({
      select: {
        id: true,
        title: true,
        toolId: true,
        apiId: true,
        status: true,
        price: true,
        api: { select: { title: true } },
      },
    }),
  ]);

  pushToolIdGroups(imei, 'imei', groups);
  pushToolIdGroups(server, 'server', groups);
  pushTitleGroups(imei, 'imei', groups);
  pushTitleGroups(server, 'server', groups);

  return groups.sort((a, b) => b.services.length - a.services.length);
}
