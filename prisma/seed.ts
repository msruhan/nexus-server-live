import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resolveAdminCredentials() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (email && password) {
    return { email, password, isCustom: true as const };
  }

  if (email || password) {
    throw new Error('[seed] Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or neither for local defaults.');
  }

  return { email: 'admin@nexus.id', password: 'admin123', isCustom: false as const };
}

async function main() {
  console.log('Seeding NexusServer…');

  const adminCreds = await resolveAdminCredentials();
  const adminPwd = await bcrypt.hash(adminCreds.password, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminCreds.email },
    update: adminCreds.isCustom ? { password: adminPwd, role: 'ADMIN' } : {},
    create: {
      name: 'Admin Hub',
      email: adminCreds.email,
      password: adminPwd,
      role: 'ADMIN',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, balance: new Prisma.Decimal(0) },
  });

  let user: { id: string; email: string } | null = null;

  if (!adminCreds.isCustom) {
    const userPwd = await bcrypt.hash('user1234', 12);

    user = await prisma.user.upsert({
      where: { email: 'reseller@demo.id' },
      update: {},
      create: {
        name: 'Andre Kurniawan',
        email: 'reseller@demo.id',
        password: userPwd,
        role: 'USER',
      },
    });

    const userWallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { balance: new Prisma.Decimal('100.00') },
      create: { userId: user.id, balance: new Prisma.Decimal('100.00') },
    });

    const existingLedger = await prisma.walletLedger.findFirst({ where: { walletId: userWallet.id } });
    if (!existingLedger) {
      await prisma.walletLedger.create({
        data: {
          walletId: userWallet.id,
          type: 'TOPUP',
          amount: new Prisma.Decimal('100.00'),
          balance: new Prisma.Decimal('100.00'),
          description: 'Initial top-up · seed',
        },
      });
    }
  }

  const provider = await prisma.imeiApi.upsert({
    where: { id: 'seed-provider-1' },
    update: {},
    create: {
      id: 'seed-provider-1',
      title: 'DhruFusion Main',
      host: 'https://supplier.dfrn.me',
      username: 'reseller01',
      apiKey: 'dev-api-key-not-real',
      apiType: 'DhruFusion',
      libraryId: 1,
      status: 'ACTIVE',
      notes: 'Mock provider — set STRESS_TEST_MODE=true for functional tests without live API.',
    },
  });

  const gSamsung = await prisma.imeiServiceGroup.upsert({
    where: { id: 'g-samsung' },
    update: {},
    create: { id: 'g-samsung', title: 'Samsung Unlock', sortOrder: 1 },
  });

  const imeiSvc = await prisma.imeiService.upsert({
    where: { id: 'svc-samsung-demo' },
    update: {
      price: new Prisma.Decimal('5.99'),
      deliveryTime: '1-24 hours',
    },
    create: {
      id: 'svc-samsung-demo',
      apiId: provider.id,
      groupId: gSamsung.id,
      toolId: '101',
      title: 'Samsung Demo Unlock',
      description: 'Demo IMEI service',
      price: new Prisma.Decimal('5.99'),
      deliveryTime: '1-24 hours',
      status: 'ACTIVE',
      requiresImei: true,
    },
  });

  const serverBox = await prisma.serverServiceBox.upsert({
    where: { id: 'box-demo' },
    update: {},
    create: { id: 'box-demo', title: 'Server Demo', sortOrder: 1 },
  });

  await prisma.serverService.upsert({
    where: { id: 'srv-demo' },
    update: {
      price: new Prisma.Decimal('7.99'),
    },
    create: {
      id: 'srv-demo',
      apiId: provider.id,
      boxId: serverBox.id,
      toolId: '301',
      title: 'Server Demo FRP',
      description: 'Demo server service',
      price: new Prisma.Decimal('7.99'),
      deliveryTime: 'Instant',
      status: 'ACTIVE',
      requiredFields: JSON.stringify([
        { key: 'username', label: 'Username', required: true, type: 'text' },
        { key: 'password', label: 'Password', required: true, type: 'password' },
      ]),
    },
  });

  console.log('Seed complete:', {
    admin: admin.email,
    user: user?.email ?? '(demo user skipped — custom admin)',
    imeiSvc: imeiSvc.id,
  });

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: 'merchant@nexus-demo.id',
      paymentUsdtPortalApiKey: 'REPLACE_WITH_REAL_USDTPORTAL_API_KEY',
      paymentUsdtPortalCallbackPassword: 'REPLACE_WITH_REAL_CALLBACK_PASSWORD',
      paymentUsdtRate: new Prisma.Decimal('1.000000'),

      paymentPaypalEnabled: true,
      paymentPaypalClientId: 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqIgrkwP47D1vScsyqSzN3Otc',
      paymentPaypalClientSecret: 'REPLACE_WITH_REAL_PAYPAL_SECRET',
      paymentPaypalMode: 'sandbox',
      paymentPaypalWebhookId: 'REPLACE_WITH_REAL_PAYPAL_WEBHOOK_ID',

      paymentStripeEnabled: true,
      paymentStripePublishableKey: 'pk_test_51REPLACE_WITH_REAL_STRIPE_PUBLISHABLE_KEY',
      paymentStripeSecretKey: 'sk_test_51REPLACE_WITH_REAL_STRIPE_SECRET_KEY',
      paymentStripeWebhookSecret: 'whsec_REPLACE_WITH_REAL_STRIPE_WEBHOOK_SECRET',
    },
    create: {
      id: 'singleton',
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: 'merchant@nexus-demo.id',
      paymentUsdtPortalApiKey: 'REPLACE_WITH_REAL_USDTPORTAL_API_KEY',
      paymentUsdtPortalCallbackPassword: 'REPLACE_WITH_REAL_CALLBACK_PASSWORD',
      paymentUsdtRate: new Prisma.Decimal('1.000000'),

      paymentPaypalEnabled: true,
      paymentPaypalClientId: 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqIgrkwP47D1vScsyqSzN3Otc',
      paymentPaypalClientSecret: 'REPLACE_WITH_REAL_PAYPAL_SECRET',
      paymentPaypalMode: 'sandbox',
      paymentPaypalWebhookId: 'REPLACE_WITH_REAL_PAYPAL_WEBHOOK_ID',

      paymentStripeEnabled: true,
      paymentStripePublishableKey: 'pk_test_51REPLACE_WITH_REAL_STRIPE_PUBLISHABLE_KEY',
      paymentStripeSecretKey: 'sk_test_51REPLACE_WITH_REAL_STRIPE_SECRET_KEY',
      paymentStripeWebhookSecret: 'whsec_REPLACE_WITH_REAL_STRIPE_WEBHOOK_SECRET',
    },
  });

  console.log('Payment gateways seeded (USDT Portal + PayPal sandbox + Stripe test).');
  console.log('→ Replace REPLACE_WITH_REAL_* values with actual credentials before going live.');

  if (user) {
    const resellerGroup = await prisma.priceGroup.upsert({
      where: { name: 'Reseller' },
      update: { adjustmentType: 'PERCENT', discountPercent: new Prisma.Decimal(10), isActive: true },
      create: {
        name: 'Reseller',
        description: 'Demo reseller tier — 10% off all services',
        adjustmentType: 'PERCENT',
        discountPercent: new Prisma.Decimal(10),
        isActive: true,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { priceGroupId: resellerGroup.id },
    });
    console.log('User group "Reseller" (10% off) assigned to reseller@demo.id');
  }

  await prisma.downloadTool.upsert({
    where: { id: 'seed-tool-demo' },
    update: {},
    create: {
      id: 'seed-tool-demo',
      title: 'Samsung USB Driver',
      description: 'Official Samsung mobile USB driver for Windows (demo entry).',
      category: 'drivers',
      version: '1.7.59',
      platform: 'Windows',
      downloadUrl: 'https://developer.samsung.com/android-usb-driver',
      isPublished: true,
      sortOrder: 10,
    },
  });
  console.log('Download tools library seeded (1 demo tool).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
