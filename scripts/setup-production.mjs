#!/usr/bin/env node
/**
 * Push Prisma schema + seed to production Postgres (Coolify / VPS).
 *
 * Usage (on server or one-off Coolify exec):
 *   cp .env.coolify.example .env.production
 *   # fill DATABASE_URL + DIRECT_URL (direct :5432, not pooler)
 *   npm run db:setup:production
 *
 * Or: node --env-file=.env.production scripts/setup-production.mjs
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envFiles = ['.env.production', '.env.coolify', '.env.local', '.env'];
const envFile = envFiles.find((f) => existsSync(resolve(process.cwd(), f)));

if (envFile) {
  console.log(`[setup-production] Loading ${envFile}`);
  process.loadEnvFile?.(resolve(process.cwd(), envFile));
}

const direct = process.env.DIRECT_URL?.trim();
const database = process.env.DATABASE_URL?.trim();

if (!database && !direct) {
  console.error(
    '[setup-production] Set DATABASE_URL and DIRECT_URL (see .env.coolify.example)',
  );
  process.exit(1);
}

if (!direct) {
  console.warn('[setup-production] DIRECT_URL not set — using DATABASE_URL for schema push');
}

if (!database) {
  process.env.DATABASE_URL = direct;
}

const pushUrl = direct || database;
const run = (cmd, extraEnv = {}) => {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
};

console.log('[setup-production] Pushing schema...');
run('npx prisma db push', {
  DATABASE_URL: pushUrl,
  DIRECT_URL: pushUrl,
});

console.log('[setup-production] Seeding initial data...');
run('npx tsx prisma/seed.ts', {
  DATABASE_URL: database || pushUrl,
});

console.log('[setup-production] Done.');
const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
if (adminEmail) {
  console.log(`  Admin: ${adminEmail} (password set at provisioning — not logged)`);
} else {
  console.log('  Admin: admin@nexus.id / admin123  (local default — set SEED_ADMIN_* for production)');
  console.log('  User:  reseller@demo.id / user1234');
}
