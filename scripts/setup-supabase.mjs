#!/usr/bin/env node
/**
 * Push Prisma schema + seed to Supabase (or any remote Postgres).
 *
 * Usage:
 *   cp .env.supabase.example .env.supabase
 *   # fill DATABASE_URL (pooler) + DIRECT_URL (direct :5432)
 *   npm run db:setup:supabase
 *
 * Or: node --env-file=.env.supabase scripts/setup-supabase.mjs
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envFiles = ['.env.supabase', '.env.local', '.env'];
const envFile = envFiles.find((f) => existsSync(resolve(process.cwd(), f)));

if (envFile) {
  console.log(`[setup-supabase] Loading ${envFile}`);
  process.loadEnvFile?.(resolve(process.cwd(), envFile));
}

const direct = process.env.DIRECT_URL?.trim();
const database = process.env.DATABASE_URL?.trim();

if (!database && !direct) {
  console.error('[setup-supabase] Set DATABASE_URL and DIRECT_URL in .env.supabase (see .env.supabase.example)');
  process.exit(1);
}

if (!direct) {
  console.warn('[setup-supabase] DIRECT_URL not set — using DATABASE_URL for schema push (may fail with pooler)');
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

console.log('[setup-supabase] Pushing schema (direct connection)...');
run('npx prisma db push', {
  DATABASE_URL: pushUrl,
  DIRECT_URL: pushUrl,
});

console.log('[setup-supabase] Seeding demo data...');
run('npx tsx prisma/seed.ts', {
  DATABASE_URL: database || pushUrl,
});

console.log('[setup-supabase] Done.');
console.log('  Admin: admin@nexus.id / admin123');
console.log('  User:  reseller@demo.id / user1234');
