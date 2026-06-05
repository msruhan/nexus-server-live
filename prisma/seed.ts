import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NexusServer…');

  const adminPwd = await bcrypt.hash('admin123', 12);
  const userPwd = await bcrypt.hash('user1234', 12);

  const admin = 
  await prisma.user.upsert({
    where: { email: 'admin@nexus.id' },
    update: {},
    create: {
      name: 'Admin Hub',
      email: 'admin@nexus.id',
      password: adminPwd,
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'reseller@demo.id' },
    update: {},
    create: {
      name: 'Andre Kurniawan',
      email: 'reseller@demo.id',
      password: userPwd,
      role: 'USER',
    },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, balance: new Prisma.Decimal(0) },
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

  console.log('Seed complete:', { admin: admin.email, user: user.email, imeiSvc: imeiSvc.id });

  // ─── Payment gateway seed ──────────────────────────────────────
  // Enables all three gateways with sandbox/test credentials so the
  // /user/wallet/topup-online page shows options immediately.
  // Wallet is USD-native. USDT Portal uses a 1:1 USD→USDT rate by default.
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      // USDT Portal
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: 'merchant@nexus-demo.id',
      paymentUsdtPortalApiKey: 'REPLACE_WITH_REAL_USDTPORTAL_API_KEY',
      paymentUsdtPortalCallbackPassword: 'REPLACE_WITH_REAL_CALLBACK_PASSWORD',
      paymentUsdtRate: new Prisma.Decimal('1.000000'), // 1 USD = 1 USDT (1:1 peg)

      // PayPal sandbox
      paymentPaypalEnabled: true,
      paymentPaypalClientId: 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqIgrkwP47D1vScsyqSzN3Otc',
      paymentPaypalClientSecret: 'REPLACE_WITH_REAL_PAYPAL_SECRET',
      paymentPaypalMode: 'sandbox',
      paymentPaypalWebhookId: 'REPLACE_WITH_REAL_PAYPAL_WEBHOOK_ID',

      // Stripe test mode
      paymentStripeEnabled: true,
      paymentStripePublishableKey: 'pk_test_51REPLACE_WITH_REAL_STRIPE_PUBLISHABLE_KEY',
      paymentStripeSecretKey: 'sk_test_51REPLACE_WITH_REAL_STRIPE_SECRET_KEY',
      paymentStripeWebhookSecret: 'whsec_REPLACE_WITH_REAL_STRIPE_WEBHOOK_SECRET',
    },
    create: {
      id: 'singleton',
      // USDT Portal
      paymentUsdtPortalEnabled: true,
      paymentUsdtPortalEmail: 'merchant@nexus-demo.id',
      paymentUsdtPortalApiKey: 'REPLACE_WITH_REAL_USDTPORTAL_API_KEY',
      paymentUsdtPortalCallbackPassword: 'REPLACE_WITH_REAL_CALLBACK_PASSWORD',
      paymentUsdtRate: new Prisma.Decimal('1.000000'),

      // PayPal sandbox
      paymentPaypalEnabled: true,
      paymentPaypalClientId: 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqIgrkwP47D1vScsyqSzN3Otc',
      paymentPaypalClientSecret: 'REPLACE_WITH_REAL_PAYPAL_SECRET',
      paymentPaypalMode: 'sandbox',
      paymentPaypalWebhookId: 'REPLACE_WITH_REAL_PAYPAL_WEBHOOK_ID',

      // Stripe test mode
      paymentStripeEnabled: true,
      paymentStripePublishableKey: 'pk_test_51REPLACE_WITH_REAL_STRIPE_PUBLISHABLE_KEY',
      paymentStripeSecretKey: 'sk_test_51REPLACE_WITH_REAL_STRIPE_SECRET_KEY',
      paymentStripeWebhookSecret: 'whsec_REPLACE_WITH_REAL_STRIPE_WEBHOOK_SECRET',
    },
  });

  console.log('Payment gateways seeded (USDT Portal + PayPal sandbox + Stripe test).');
  console.log('→ Replace REPLACE_WITH_REAL_* values with actual credentials before going live.');

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
