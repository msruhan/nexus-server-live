import { PrismaClient } from '@prisma/client';
import { seedMarketplaceCatalog } from './lib/seed-marketplace-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding marketplace groups and services…');
  await seedMarketplaceCatalog(prisma);
  console.log('Marketplace seed completed.');
  console.log('Groups: iRemoval, Chimera Tools, SamKEY Tools, TFM Tools');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
