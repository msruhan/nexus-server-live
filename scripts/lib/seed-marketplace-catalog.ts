import { Prisma, type PrismaClient } from '@prisma/client';

type ImeiSeedService = {
  id: string;
  toolId: string;
  title: string;
  description: string;
  price: string;
  deliveryTime: string;
};

type ServerSeedService = {
  id: string;
  toolId: string;
  title: string;
  description: string;
  price: string;
  deliveryTime: string;
};

const imeiServices: ImeiSeedService[] = [
  {
    id: 'svc-iremoval-xr-xs-11',
    toolId: 'IRM-101',
    title: 'iRemoval Basic (iPhone XR/XS/11)',
    description:
      'Entry package for iPhone XR, XS, XS Max, 11, and 11 Pro line. Best for standard iRemoval requests with stable turnaround.',
    price: '9.99',
    deliveryTime: '1-24 hours',
  },
  {
    id: 'svc-iremoval-12-13',
    toolId: 'IRM-102',
    title: 'iRemoval Standard (iPhone 12/13 Series)',
    description:
      'Standard iRemoval package for iPhone 12 mini to 13 Pro Max. Balanced pricing for daily reseller volume.',
    price: '14.99',
    deliveryTime: '1-24 hours',
  },
  {
    id: 'svc-iremoval-14-14plus',
    toolId: 'IRM-103',
    title: 'iRemoval Advanced (iPhone 14/14 Plus)',
    description:
      'Advanced package for iPhone 14 and 14 Plus with tighter supplier handling and priority checks.',
    price: '19.99',
    deliveryTime: '1-24 hours',
  },
  {
    id: 'svc-iremoval-14pro-15',
    toolId: 'IRM-104',
    title: 'iRemoval Pro (iPhone 14 Pro/15)',
    description:
      'Pro package for iPhone 14 Pro, 14 Pro Max, iPhone 15, and 15 Plus. Recommended for premium model requests.',
    price: '24.99',
    deliveryTime: '1-24 hours',
  },
  {
    id: 'svc-iremoval-15pro-max',
    toolId: 'IRM-105',
    title: 'iRemoval Premium (iPhone 15 Pro/15 Pro Max)',
    description:
      'Premium package for top-tier iPhone models including 15 Pro and 15 Pro Max with highest priority queue.',
    price: '29.99',
    deliveryTime: '1-24 hours',
  },
];

const chimeraServices: ServerSeedService[] = [
  {
    id: 'srv-chimera-3m',
    toolId: 'CHM-301',
    title: 'Chimera Tool License - 3 Months',
    description:
      '3-month Chimera Tool license for supported operations across popular brands. Good starter option for light usage.',
    price: '29.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-chimera-12m',
    toolId: 'CHM-302',
    title: 'Chimera Tool License - 12 Months',
    description:
      '1-year Chimera Tool license for regular service shops needing stable long-term access.',
    price: '79.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-chimera-24m',
    toolId: 'CHM-303',
    title: 'Chimera Tool License - 24 Months',
    description:
      '2-year Chimera Tool license with better long-term value for high-frequency unlock and servicing teams.',
    price: '129.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-chimera-full-12m',
    toolId: 'CHM-304',
    title: 'Chimera Tool Full Package - 12 Months',
    description:
      'Full-feature annual package for advanced workflows and professional reseller operations.',
    price: '149.00',
    deliveryTime: 'Instant',
  },
];

const samkeyServices: ServerSeedService[] = [
  {
    id: 'srv-samkey-3m',
    toolId: 'SMK-401',
    title: 'SamKEY License - 3 Months',
    description:
      '3-month SamKEY access for Samsung-focused service jobs and routine account operations.',
    price: '19.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-samkey-12m',
    toolId: 'SMK-402',
    title: 'SamKEY License - 12 Months',
    description:
      'Annual SamKEY license for resellers handling recurring Samsung service demand.',
    price: '59.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-samkey-credits-100',
    toolId: 'SMK-403',
    title: 'SamKEY Credits Pack - 100 Credits',
    description:
      'Credit pack for occasional operations. Suitable for low-to-medium monthly order volume.',
    price: '25.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-samkey-credits-500',
    toolId: 'SMK-404',
    title: 'SamKEY Credits Pack - 500 Credits',
    description:
      'Bulk credit package with better effective rate for active shops and high turnover.',
    price: '99.00',
    deliveryTime: 'Instant',
  },
];

const tfmServices: ServerSeedService[] = [
  {
    id: 'srv-tfm-3m',
    toolId: 'TFM-501',
    title: 'TFM Tool License - 3 Months',
    description:
      'Starter 3-month TFM license for device servicing and unlock workflows.',
    price: '25.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-tfm-12m',
    toolId: 'TFM-502',
    title: 'TFM Tool License - 12 Months',
    description:
      '12-month TFM license for regular technical teams requiring daily access.',
    price: '69.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-tfm-24m',
    toolId: 'TFM-503',
    title: 'TFM Tool License - 24 Months',
    description:
      '2-year TFM license for long-term cost efficiency and uninterrupted coverage.',
    price: '119.00',
    deliveryTime: 'Instant',
  },
  {
    id: 'srv-tfm-premium',
    toolId: 'TFM-504',
    title: 'TFM Tool Premium Support Pack',
    description:
      'Premium package with priority handling profile and support-oriented provisioning.',
    price: '149.00',
    deliveryTime: 'Instant',
  },
];

function serverRequiredFields() {
  return JSON.stringify([
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'username', label: 'Username', required: true, type: 'text' },
    { key: 'licensekey', label: 'License Key', required: true, type: 'text' },
    { key: 'comments', label: 'Notes', required: false, type: 'textarea' },
  ]);
}

async function seedImeiGroup(
  prisma: PrismaClient,
  apiId: string,
  group: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
  },
  services: ImeiSeedService[],
) {
  const g = await prisma.imeiServiceGroup.upsert({
    where: { id: group.id },
    update: {
      title: group.title,
      description: group.description,
      imageUrl: group.imageUrl,
      marketplaceVisible: true,
      featured: true,
      sortOrder: group.sortOrder,
    },
    create: {
      id: group.id,
      title: group.title,
      description: group.description,
      imageUrl: group.imageUrl,
      marketplaceVisible: true,
      featured: true,
      sortOrder: group.sortOrder,
    },
  });

  for (const s of services) {
    await prisma.imeiService.upsert({
      where: { id: s.id },
      update: {
        apiId,
        groupId: g.id,
        toolId: s.toolId,
        title: s.title,
        description: s.description,
        price: new Prisma.Decimal(s.price),
        deliveryTime: s.deliveryTime,
        status: 'ACTIVE',
        requiresImei: true,
        requiresModel: true,
        requiresSn: false,
      },
      create: {
        id: s.id,
        apiId,
        groupId: g.id,
        toolId: s.toolId,
        title: s.title,
        description: s.description,
        price: new Prisma.Decimal(s.price),
        deliveryTime: s.deliveryTime,
        status: 'ACTIVE',
        requiresImei: true,
        requiresModel: true,
        requiresSn: false,
      },
    });
  }
}

async function seedServerBox(
  prisma: PrismaClient,
  apiId: string,
  box: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
    featured?: boolean;
  },
  services: ServerSeedService[],
) {
  const b = await prisma.serverServiceBox.upsert({
    where: { id: box.id },
    update: {
      title: box.title,
      description: box.description,
      imageUrl: box.imageUrl,
      marketplaceVisible: true,
      featured: box.featured ?? false,
      sortOrder: box.sortOrder,
    },
    create: {
      id: box.id,
      title: box.title,
      description: box.description,
      imageUrl: box.imageUrl,
      marketplaceVisible: true,
      featured: box.featured ?? false,
      sortOrder: box.sortOrder,
    },
  });

  for (const s of services) {
    await prisma.serverService.upsert({
      where: { id: s.id },
      update: {
        apiId,
        boxId: b.id,
        toolId: s.toolId,
        title: s.title,
        description: s.description,
        price: new Prisma.Decimal(s.price),
        deliveryTime: s.deliveryTime,
        status: 'ACTIVE',
        requiredFields: serverRequiredFields(),
      },
      create: {
        id: s.id,
        apiId,
        boxId: b.id,
        toolId: s.toolId,
        title: s.title,
        description: s.description,
        price: new Prisma.Decimal(s.price),
        deliveryTime: s.deliveryTime,
        status: 'ACTIVE',
        requiredFields: serverRequiredFields(),
      },
    });
  }
}

/** Idempotent marketplace catalog — groups, services, provider. */
export async function seedMarketplaceCatalog(prisma: PrismaClient) {
  const provider = await prisma.imeiApi.upsert({
    where: { id: 'seed-provider-1' },
    update: { status: 'ACTIVE' },
    create: {
      id: 'seed-provider-1',
      title: 'DhruFusion Main',
      host: 'https://supplier.dfrn.me',
      username: 'reseller01',
      apiKey: 'dev-api-key-not-real',
      apiType: 'DhruFusion',
      libraryId: 1,
      status: 'ACTIVE',
      notes: 'Seed provider for marketplace demo services.',
    },
  });

  await seedImeiGroup(
    prisma,
    provider.id,
    {
      id: 'g-iremoval',
      title: 'iRemoval',
      description:
        'iPhone removal services with broad model coverage from XR/XS line up to iPhone 15 Pro Max.',
      imageUrl: '/uploads/marketplace/iremoval.jpeg',
      sortOrder: 10,
    },
    imeiServices,
  );

  await seedServerBox(
    prisma,
    provider.id,
    {
      id: 'box-chimera-tools',
      title: 'Chimera Tools',
      description:
        'License-based Chimera Tool services for professional unlock and device servicing workflows.',
      imageUrl: '/uploads/marketplace/chimera.png',
      sortOrder: 20,
      featured: true,
    },
    chimeraServices,
  );

  await seedServerBox(
    prisma,
    provider.id,
    {
      id: 'box-samkey-tools',
      title: 'SamKEY Tools',
      description:
        'Samsung-focused SamKEY licenses and credit packs for daily operational use.',
      imageUrl: '/uploads/marketplace/samkey.png',
      sortOrder: 30,
      featured: false,
    },
    samkeyServices,
  );

  await seedServerBox(
    prisma,
    provider.id,
    {
      id: 'box-tfm-tools',
      title: 'TFM Tools',
      description:
        'TFM tool license packages designed for structured long-term servicing plans.',
      imageUrl: '/uploads/marketplace/tfm-tools.png',
      sortOrder: 40,
      featured: false,
    },
    tfmServices,
  );

  return provider;
}

export const MARKETPLACE_IMEI_SERVICE_IDS = imeiServices.map((s) => s.id);
export const MARKETPLACE_SERVER_SERVICE_IDS = [
  ...chimeraServices,
  ...samkeyServices,
  ...tfmServices,
].map((s) => s.id);
