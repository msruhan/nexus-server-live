/**
 * Demo presentation seed — idempotent data for nexus-demo (read-only UI).
 * Run: npm run db:seed:demo  (with DATABASE_URL from .env.supabase)
 */
import {
  Prisma,
  PrismaClient,
  type ImeiOrderStatus,
  type ServerOrderStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  MARKETPLACE_IMEI_SERVICE_IDS,
  MARKETPLACE_SERVER_SERVICE_IDS,
  seedMarketplaceCatalog,
} from './lib/seed-marketplace-catalog';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'user1234';
const ADMIN_PASSWORD = 'admin123';

const IMEI_STATUS_CYCLE: ImeiOrderStatus[] = [
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'IN_PROCESS',
  'IN_PROCESS',
  'PENDING',
  'PENDING',
  'REJECTED',
  'CANCELLED',
];

const SERVER_STATUS_CYCLE: ServerOrderStatus[] = [
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'SUCCESS',
  'IN_PROCESS',
  'PENDING',
  'REJECTED',
  'CANCELLED',
];

const MODELS = [
  'iPhone 14 Pro Max',
  'iPhone 13',
  'iPhone 12',
  'iPhone 15',
  'iPhone 11',
  'iPhone XR',
];

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60_000);
}

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d;
}

function demoImei(n: number): string {
  const base = 350000000000000 + n * 137;
  return String(base).slice(0, 15);
}

function demoOrderCode(kind: 'imei' | 'server', index: number): string {
  const n = String(index).padStart(4, '0');
  return kind === 'imei' ? `ID-DEMOIMEI${n}` : `ID-DEMOSRV${n}`;
}

function serverFieldsPayload(email: string, username: string, licenseKey: string) {
  return JSON.stringify({
    email,
    username,
    licensekey: licenseKey,
    comments: 'Demo presentation order',
  });
}

function statusExtras(status: ImeiOrderStatus | ServerOrderStatus, createdAt: Date) {
  if (status === 'SUCCESS') {
    const completedAt = new Date(createdAt.getTime() + 2 * 60 * 60_000);
    return {
      processedAt: new Date(createdAt.getTime() + 30 * 60_000),
      completedAt,
      code: 'UNLOCK-OK-DEMO',
      comments: 'Completed successfully — demo seed.',
    };
  }
  if (status === 'IN_PROCESS') {
    return {
      processedAt: new Date(createdAt.getTime() + 15 * 60_000),
      completedAt: null,
      code: null,
      comments: 'Processing with upstream supplier.',
    };
  }
  if (status === 'REJECTED') {
    return {
      processedAt: new Date(createdAt.getTime() + 45 * 60_000),
      completedAt: new Date(createdAt.getTime() + 60 * 60_000),
      code: null,
      comments: 'Rejected — model not supported on this route.',
    };
  }
  if (status === 'CANCELLED') {
    return {
      processedAt: null,
      completedAt: new Date(createdAt.getTime() + 20 * 60_000),
      code: null,
      comments: 'Cancelled by user before supplier pickup.',
    };
  }
  return { processedAt: null, completedAt: null, code: null, comments: null };
}

async function seedUsers() {
  const adminPwd = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const userPwd = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.id' },
    update: {},
    create: {
      name: 'Admin Hub',
      email: 'admin@nexus.id',
      password: adminPwd,
      role: 'ADMIN',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, balance: new Prisma.Decimal(0) },
  });

  const resellerGroup = await prisma.priceGroup.upsert({
    where: { name: 'Reseller' },
    update: {
      adjustmentType: 'PERCENT',
      discountPercent: new Prisma.Decimal(10),
      isActive: true,
    },
    create: {
      name: 'Reseller',
      description: 'Demo reseller tier — 10% off all services',
      adjustmentType: 'PERCENT',
      discountPercent: new Prisma.Decimal(10),
      isActive: true,
    },
  });

  const demoAccounts = [
    { email: 'reseller@demo.id', name: 'Andre Kurniawan', balance: '892.50' },
    { email: 'shop.jakarta@demo.id', name: 'Budi Cell Jakarta', balance: '450.00' },
    { email: 'gsm.bandung@demo.id', name: 'Rina GSM Bandung', balance: '1200.00' },
  ];

  const users: { id: string; email: string; name: string }[] = [];

  for (const acc of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { name: acc.name, priceGroupId: resellerGroup.id },
      create: {
        name: acc.name,
        email: acc.email,
        password: userPwd,
        role: 'USER',
        priceGroupId: resellerGroup.id,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balance: new Prisma.Decimal(acc.balance) },
      create: { userId: user.id, balance: new Prisma.Decimal(acc.balance) },
    });

    users.push({ id: user.id, email: acc.email, name: acc.name });
  }

  return { admin, users, resellerGroup };
}

async function seedWalletHistory(users: { id: string; email: string }[]) {
  const ledgerDefs: Array<{
    id: string;
    userEmail: string;
    type: string;
    amount: string;
    balance: string;
    description: string;
    daysAgoVal: number;
    referenceId?: string;
  }> = [
    {
      id: 'demo-ledger-andre-1',
      userEmail: 'reseller@demo.id',
      type: 'TOPUP',
      amount: '500.00',
      balance: '500.00',
      description: 'Bank transfer top-up · approved',
      daysAgoVal: 28,
    },
    {
      id: 'demo-ledger-andre-2',
      userEmail: 'reseller@demo.id',
      type: 'PAYMENT',
      amount: '-24.99',
      balance: '475.01',
      description: 'IMEI order payment',
      daysAgoVal: 25,
      referenceId: 'demo-imei-001',
    },
    {
      id: 'demo-ledger-andre-3',
      userEmail: 'reseller@demo.id',
      type: 'TOPUP',
      amount: '500.00',
      balance: '975.01',
      description: 'USDT Portal top-up',
      daysAgoVal: 18,
    },
    {
      id: 'demo-ledger-andre-4',
      userEmail: 'reseller@demo.id',
      type: 'REFUND',
      amount: '19.99',
      balance: '995.00',
      description: 'Refund rejected IMEI order',
      daysAgoVal: 14,
      referenceId: 'demo-imei-010',
    },
    {
      id: 'demo-ledger-andre-5',
      userEmail: 'reseller@demo.id',
      type: 'PAYMENT',
      amount: '-79.00',
      balance: '916.00',
      description: 'Server license payment',
      daysAgoVal: 10,
      referenceId: 'demo-srv-003',
    },
    {
      id: 'demo-ledger-jakarta-1',
      userEmail: 'shop.jakarta@demo.id',
      type: 'TOPUP',
      amount: '300.00',
      balance: '300.00',
      description: 'Manual top-up · seed',
      daysAgoVal: 21,
    },
    {
      id: 'demo-ledger-jakarta-2',
      userEmail: 'shop.jakarta@demo.id',
      type: 'PAYMENT',
      amount: '-29.00',
      balance: '271.00',
      description: 'Chimera 3M license',
      daysAgoVal: 16,
    },
    {
      id: 'demo-ledger-jakarta-3',
      userEmail: 'shop.jakarta@demo.id',
      type: 'TOPUP',
      amount: '200.00',
      balance: '471.00',
      description: 'PayPal sandbox top-up',
      daysAgoVal: 8,
    },
    {
      id: 'demo-ledger-bandung-1',
      userEmail: 'gsm.bandung@demo.id',
      type: 'TOPUP',
      amount: '1000.00',
      balance: '1000.00',
      description: 'Opening balance',
      daysAgoVal: 30,
    },
    {
      id: 'demo-ledger-bandung-2',
      userEmail: 'gsm.bandung@demo.id',
      type: 'PAYMENT',
      amount: '-149.00',
      balance: '851.00',
      description: 'TFM premium pack',
      daysAgoVal: 22,
    },
    {
      id: 'demo-ledger-bandung-3',
      userEmail: 'gsm.bandung@demo.id',
      type: 'TOPUP',
      amount: '400.00',
      balance: '1251.00',
      description: 'Stripe test top-up',
      daysAgoVal: 5,
    },
    {
      id: 'demo-ledger-bandung-4',
      userEmail: 'gsm.bandung@demo.id',
      type: 'REFUND',
      amount: '29.99',
      balance: '1280.99',
      description: 'Partial refund demo',
      daysAgoVal: 3,
    },
  ];

  for (const row of ledgerDefs) {
    const user = users.find((u) => u.email === row.userEmail);
    if (!user) continue;
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) continue;

    await prisma.walletLedger.upsert({
      where: { id: row.id },
      update: {
        type: row.type,
        amount: new Prisma.Decimal(row.amount),
        balance: new Prisma.Decimal(row.balance),
        description: row.description,
        referenceId: row.referenceId ?? null,
        createdAt: daysAgo(row.daysAgoVal),
      },
      create: {
        id: row.id,
        walletId: wallet.id,
        type: row.type,
        amount: new Prisma.Decimal(row.amount),
        balance: new Prisma.Decimal(row.balance),
        description: row.description,
        referenceId: row.referenceId ?? null,
        createdAt: daysAgo(row.daysAgoVal),
      },
    });
  }
}

async function seedTopups(users: { id: string; email: string }[], adminId: string) {
  const topups: Array<{
    id: string;
    userEmail: string;
    amount: string;
    status: string;
    note: string;
    daysAgoVal: number;
    reviewed?: boolean;
  }> = [
    { id: 'demo-topup-001', userEmail: 'reseller@demo.id', amount: '150.00', status: 'PENDING', note: 'BCA transfer — awaiting proof', daysAgoVal: 1 },
    { id: 'demo-topup-002', userEmail: 'shop.jakarta@demo.id', amount: '75.00', status: 'PENDING', note: 'Mandiri — receipt uploaded', daysAgoVal: 0 },
    { id: 'demo-topup-003', userEmail: 'gsm.bandung@demo.id', amount: '200.00', status: 'PENDING', note: 'USDT pending confirmation', daysAgoVal: 2 },
    { id: 'demo-topup-004', userEmail: 'reseller@demo.id', amount: '500.00', status: 'APPROVED', note: 'Approved bank transfer', daysAgoVal: 28, reviewed: true },
    { id: 'demo-topup-005', userEmail: 'reseller@demo.id', amount: '500.00', status: 'APPROVED', note: 'USDT Portal', daysAgoVal: 18, reviewed: true },
    { id: 'demo-topup-006', userEmail: 'shop.jakarta@demo.id', amount: '300.00', status: 'APPROVED', note: 'Manual approval', daysAgoVal: 21, reviewed: true },
    { id: 'demo-topup-007', userEmail: 'shop.jakarta@demo.id', amount: '200.00', status: 'APPROVED', note: 'PayPal sandbox', daysAgoVal: 8, reviewed: true },
    { id: 'demo-topup-008', userEmail: 'gsm.bandung@demo.id', amount: '1000.00', status: 'APPROVED', note: 'Opening balance', daysAgoVal: 30, reviewed: true },
    { id: 'demo-topup-009', userEmail: 'gsm.bandung@demo.id', amount: '400.00', status: 'APPROVED', note: 'Stripe test', daysAgoVal: 5, reviewed: true },
    { id: 'demo-topup-010', userEmail: 'reseller@demo.id', amount: '50.00', status: 'APPROVED', note: 'Small top-up', daysAgoVal: 12, reviewed: true },
    { id: 'demo-topup-011', userEmail: 'shop.jakarta@demo.id', amount: '25.00', status: 'REJECTED', note: 'Proof unclear', daysAgoVal: 15, reviewed: true },
    { id: 'demo-topup-012', userEmail: 'gsm.bandung@demo.id', amount: '100.00', status: 'REJECTED', note: 'Duplicate request', daysAgoVal: 9, reviewed: true },
    { id: 'demo-topup-013', userEmail: 'reseller@demo.id', amount: '80.00', status: 'APPROVED', note: 'Quick approval', daysAgoVal: 6, reviewed: true },
  ];

  for (const t of topups) {
    const user = users.find((u) => u.email === t.userEmail);
    if (!user) continue;
    const createdAt = daysAgo(t.daysAgoVal);
    await prisma.topupRequest.upsert({
      where: { id: t.id },
      update: {
        amount: new Prisma.Decimal(t.amount),
        status: t.status,
        note: t.note,
        reviewedAt: t.reviewed ? createdAt : null,
        reviewedBy: t.reviewed ? adminId : null,
        createdAt,
      },
      create: {
        id: t.id,
        userId: user.id,
        amount: new Prisma.Decimal(t.amount),
        status: t.status,
        note: t.note,
        reviewedAt: t.reviewed ? createdAt : null,
        reviewedBy: t.reviewed ? adminId : null,
        createdAt,
      },
    });
  }
}

async function seedImeiOrders(
  users: { id: string; email: string }[],
  servicePrices: Map<string, Prisma.Decimal>,
) {
  const userIds = users.map((u) => u.id);
  const serviceIds = MARKETPLACE_IMEI_SERVICE_IDS;

  for (let i = 1; i <= 42; i++) {
    const userId = userIds[(i - 1) % userIds.length]!;
    const serviceId = serviceIds[(i - 1) % serviceIds.length]!;
    const status = IMEI_STATUS_CYCLE[(i - 1) % IMEI_STATUS_CYCLE.length]!;

    let createdAt: Date;
    if (i <= 6) {
      createdAt = hoursAgo(2 + (i % 4));
    } else {
      createdAt = daysAgo(7 + ((i - 7) % 24), 8 + (i % 10));
    }

    const extras = statusExtras(status, createdAt);
    const price = servicePrices.get(serviceId) ?? new Prisma.Decimal('14.99');

    await prisma.imeiOrder.upsert({
      where: { id: `demo-imei-${String(i).padStart(3, '0')}` },
      update: {
        userId,
        serviceId,
        imei: demoImei(i),
        model: MODELS[(i - 1) % MODELS.length],
        price,
        status,
        network: i % 3 === 0 ? 'AT&T' : null,
        note: i % 5 === 0 ? 'Rush — customer waiting in shop' : null,
        referenceId: `REF-DEMO-${i}`,
        ...extras,
        createdAt,
        updatedAt: extras.completedAt ?? createdAt,
      },
      create: {
        id: `demo-imei-${String(i).padStart(3, '0')}`,
        orderCode: demoOrderCode('imei', i),
        userId,
        serviceId,
        imei: demoImei(i),
        model: MODELS[(i - 1) % MODELS.length],
        price,
        status,
        network: i % 3 === 0 ? 'AT&T' : null,
        note: i % 5 === 0 ? 'Rush — customer waiting in shop' : null,
        referenceId: `REF-DEMO-${i}`,
        ...extras,
        createdAt,
        updatedAt: extras.completedAt ?? createdAt,
      },
    });
  }
}

async function seedServerOrders(
  users: { id: string; email: string }[],
  servicePrices: Map<string, Prisma.Decimal>,
) {
  const userIds = users.map((u) => u.id);
  const serviceIds = MARKETPLACE_SERVER_SERVICE_IDS;

  for (let i = 1; i <= 18; i++) {
    const user = users[(i - 1) % users.length]!;
    const serviceId = serviceIds[(i - 1) % serviceIds.length]!;
    const status = SERVER_STATUS_CYCLE[(i - 1) % SERVER_STATUS_CYCLE.length]!;

    let createdAt: Date;
    if (i <= 4) {
      createdAt = hoursAgo(1 + i);
    } else {
      createdAt = daysAgo(8 + ((i - 5) % 22), 9 + (i % 8));
    }

    const extras = statusExtras(status, createdAt);
    const price = servicePrices.get(serviceId) ?? new Prisma.Decimal('29.00');

    await prisma.serverOrder.upsert({
      where: { id: `demo-srv-${String(i).padStart(3, '0')}` },
      update: {
        userId: user.id,
        serviceId,
        price,
        status,
        email: user.email,
        requiredFields: serverFieldsPayload(
          user.email,
          `user${i}`,
          `LIC-DEMO-${String(i).padStart(6, '0')}`,
        ),
        referenceId: `SRV-REF-${i}`,
        ...extras,
        createdAt,
        updatedAt: extras.completedAt ?? createdAt,
      },
      create: {
        id: `demo-srv-${String(i).padStart(3, '0')}`,
        orderCode: demoOrderCode('server', i),
        userId: user.id,
        serviceId,
        price,
        status,
        email: user.email,
        requiredFields: serverFieldsPayload(
          user.email,
          `user${i}`,
          `LIC-DEMO-${String(i).padStart(6, '0')}`,
        ),
        referenceId: `SRV-REF-${i}`,
        ...extras,
        createdAt,
        updatedAt: extras.completedAt ?? createdAt,
      },
    });
  }
}

async function seedCms() {
  const headerMenus = [
    { id: 'nav-demo-marketplace', label: 'Marketplace', href: '/marketplace', sortOrder: 10 },
    { id: 'nav-demo-catalog', label: 'Catalog', href: '#catalog', sortOrder: 20 },
    { id: 'nav-demo-how', label: 'How it works', href: '#how-to-order', sortOrder: 30 },
    { id: 'nav-demo-track', label: 'Track order', href: '/track', sortOrder: 40 },
    { id: 'nav-demo-ledger', label: 'Ledger', href: '#ledger', sortOrder: 50 },
    { id: 'nav-demo-voices', label: 'Voices', href: '#voices', sortOrder: 60 },
  ];

  for (const m of headerMenus) {
    await prisma.navigationMenu.upsert({
      where: { id: m.id },
      update: {
        location: 'header',
        label: m.label,
        href: m.href,
        isVisible: true,
        sortOrder: m.sortOrder,
        parentId: null,
      },
      create: {
        id: m.id,
        location: 'header',
        label: m.label,
        href: m.href,
        isVisible: true,
        sortOrder: m.sortOrder,
      },
    });
  }

  const footerMenus = [
    { id: 'nav-demo-footer-marketplace', label: 'Marketplace', href: '/marketplace', sortOrder: 10 },
    { id: 'nav-demo-footer-track', label: 'Track', href: '/track', sortOrder: 20 },
    { id: 'nav-demo-footer-login', label: 'Sign in', href: '/login', sortOrder: 30 },
  ];

  for (const m of footerMenus) {
    await prisma.navigationMenu.upsert({
      where: { id: m.id },
      update: {
        location: 'footer',
        label: m.label,
        href: m.href,
        isVisible: true,
        sortOrder: m.sortOrder,
      },
      create: {
        id: m.id,
        location: 'footer',
        label: m.label,
        href: m.href,
        isVisible: true,
        sortOrder: m.sortOrder,
      },
    });
  }

  const faqs = [
    {
      id: 'faq-demo-1',
      category: 'general',
      question: 'How do I place an IMEI order?',
      answer:
        'Browse the marketplace or user catalog, select a service, enter the IMEI and required fields, then submit. Your wallet is debited when the order is accepted.',
      sortOrder: 10,
    },
    {
      id: 'faq-demo-2',
      category: 'general',
      question: 'How long does delivery take?',
      answer:
        'Delivery times vary by service — from instant server licenses to 1–24 hours for IMEI routes. Each service card shows the expected window.',
      sortOrder: 20,
    },
    {
      id: 'faq-demo-3',
      category: 'wallet',
      question: 'How do I top up my wallet?',
      answer:
        'Use manual bank transfer with proof upload, or enable online gateways (USDT Portal, PayPal, Stripe) from the wallet page when configured by admin.',
      sortOrder: 30,
    },
    {
      id: 'faq-demo-4',
      category: 'wallet',
      question: 'Can I get a refund?',
      answer:
        'Rejected or cancelled orders may be refunded to your wallet automatically depending on service rules. Check your ledger for REFUND entries.',
      sortOrder: 40,
    },
    {
      id: 'faq-demo-5',
      category: 'orders',
      question: 'How do I track an order?',
      answer:
        'Use the public Track page with your order code (format ID-XXXXXXXX), or open Orders in your dashboard after signing in.',
      sortOrder: 50,
    },
    {
      id: 'faq-demo-6',
      category: 'orders',
      question: 'What is the Reseller price group?',
      answer:
        'Reseller accounts receive a percentage discount on catalog prices. Your tier is shown in account settings when assigned by admin.',
      sortOrder: 60,
    },
  ];

  for (const f of faqs) {
    await prisma.faqItem.upsert({
      where: { id: f.id },
      update: {
        category: f.category,
        question: f.question,
        answer: f.answer,
        isVisible: true,
        sortOrder: f.sortOrder,
      },
      create: {
        id: f.id,
        category: f.category,
        question: f.question,
        answer: f.answer,
        isVisible: true,
        sortOrder: f.sortOrder,
      },
    });
  }

  const testimonials = [
    {
      id: 'testi-demo-1',
      name: 'Andre K.',
      role: 'Reseller · Jakarta',
      rating: 5,
      content:
        'Fast turnaround on iRemoval orders. The dashboard and wallet ledger make it easy to reconcile daily sales.',
      sortOrder: 10,
    },
    {
      id: 'testi-demo-2',
      name: 'Budi Cell',
      role: 'Shop owner',
      rating: 5,
      content:
        'Server licenses deliver instantly. Chimera and SamKEY packs are exactly what our technicians need.',
      sortOrder: 20,
    },
    {
      id: 'testi-demo-3',
      name: 'Rina GSM',
      role: 'Bandung',
      rating: 4,
      content:
        'Clean marketplace layout and clear pricing. Top-up approval is straightforward for our finance team.',
      sortOrder: 30,
    },
    {
      id: 'testi-demo-4',
      name: 'Dimas P.',
      role: 'Freelance unlock',
      rating: 5,
      content:
        'Track page works well for customers who only have the order code. Support tickets link to orders too.',
      sortOrder: 40,
    },
    {
      id: 'testi-demo-5',
      name: 'Sari Tech',
      role: 'Surabaya reseller',
      rating: 5,
      content:
        'The reseller discount tier pays for itself within the first week of volume. Highly recommended for shops.',
      sortOrder: 50,
    },
  ];

  for (const t of testimonials) {
    await prisma.testimonial.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        role: t.role,
        rating: t.rating,
        content: t.content,
        isVisible: true,
        sortOrder: t.sortOrder,
      },
      create: {
        id: t.id,
        name: t.name,
        role: t.role,
        rating: t.rating,
        content: t.content,
        isVisible: true,
        sortOrder: t.sortOrder,
      },
    });
  }
}

async function loadServicePrices() {
  const [imei, server] = await Promise.all([
    prisma.imeiService.findMany({
      where: { id: { in: MARKETPLACE_IMEI_SERVICE_IDS } },
      select: { id: true, price: true },
    }),
    prisma.serverService.findMany({
      where: { id: { in: MARKETPLACE_SERVER_SERVICE_IDS } },
      select: { id: true, price: true },
    }),
  ]);

  const map = new Map<string, Prisma.Decimal>();
  for (const s of [...imei, ...server]) map.set(s.id, s.price);
  return map;
}

async function main() {
  console.log('Seeding demo presentation data…\n');

  console.log('1/6 Marketplace catalog…');
  await seedMarketplaceCatalog(prisma);

  console.log('2/6 Users & wallets…');
  const { admin, users } = await seedUsers();

  console.log('3/6 Wallet ledger & top-ups…');
  await seedWalletHistory(users);
  await seedTopups(users, admin.id);

  const prices = await loadServicePrices();

  console.log('4/6 IMEI orders (42)…');
  await seedImeiOrders(users, prices);

  console.log('5/6 Server orders (18)…');
  await seedServerOrders(users, prices);

  console.log('6/6 CMS (nav, FAQ, testimonials)…');
  await seedCms();

  console.log('\nDemo presentation seed complete.');
  console.log('────────────────────────────────────────');
  console.log('Admin:    admin@nexus.id / admin123');
  console.log('Reseller: reseller@demo.id / user1234');
  console.log('          shop.jakarta@demo.id / user1234');
  console.log('          gsm.bandung@demo.id / user1234');
  console.log('────────────────────────────────────────');
  console.log('42 IMEI orders · 18 server orders · 13 top-ups · CMS nav/FAQ/testimonials');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
