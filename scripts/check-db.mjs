#!/usr/bin/env node
/**
 * Verifies DATABASE_URL is reachable and core tables exist before `npm start`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const requiredTables = ['User', 'SiteSettings', 'PageSection', 'ImeiOrder'];

function formatDatabaseTarget(url) {
  try {
    const u = new URL(url.replace(/^postgresql:/, 'http:'));
    const db = u.pathname.replace(/^\//, '') || '(default)';
    return `${u.hostname}:${u.port || '5432'}/${db}`;
  } catch {
    return url.replace(/:[^:@/]+@/, ':***@');
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[check-db] DATABASE_URL is not set. Copy .env.example to .env');
    process.exit(1);
  }

  console.log('[check-db] Target:', formatDatabaseTarget(url));

  try {
    const rows = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = ANY(${requiredTables}::text[])
    `;
    const found = new Set(rows.map((r) => r.tablename));
    const missing = requiredTables.filter((t) => !found.has(t));

    if (missing.length > 0) {
      console.error('[check-db] Missing tables:', missing.join(', '));
      console.error('[check-db] This DATABASE_URL has no Nexus schema yet.');
      console.error('[check-db] 1) Start Postgres:  npm run db:up');
      console.error('[check-db] 2) Apply schema:   npm run db:push');
      console.error('[check-db] 3) Seed data:      npm run db:seed');
      console.error('[check-db] Or one command:    npm run db:setup');
      process.exit(1);
    }

    console.log('[check-db] Database OK');
  } catch (e) {
    console.error('[check-db] Cannot connect to database.');
    console.error('[check-db] Ensure Docker is running: npm run db:up');
    console.error(e?.message ?? e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
