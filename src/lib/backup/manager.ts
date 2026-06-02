/**
 * Database backup manager.
 *
 * Runs `pg_dump` against the configured PostgreSQL database, gzips the
 * output to a file under BACKUP_DIR, records a DatabaseBackup row, and
 * prunes old backups beyond the retention count.
 *
 * Design:
 *   - Never throws to the caller — returns a result object and records
 *     failures in the DatabaseBackup row + activity log.
 *   - Credentials are passed to pg_dump via env (PGPASSWORD) so they never
 *     appear in the process arg list / logs.
 *   - A module-level lock prevents concurrent dumps.
 */
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { prisma } from '@/lib/db';

export type BackupTrigger = 'manual' | 'daily' | 'weekly' | 'monthly';

let backupInProgress = false;

export function isBackupInProgress(): boolean {
  return backupInProgress;
}

export function getBackupDir(): string {
  const dir = process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), 'storage', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

type ParsedDbUrl = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};

/** Parse a PostgreSQL connection string into pg_dump-friendly parts. */
export function parseDatabaseUrl(raw: string | undefined): ParsedDbUrl | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!u.protocol.startsWith('postgres')) return null;
    return {
      host: u.hostname || 'localhost',
      port: u.port || '5432',
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || ''),
      database: u.pathname.replace(/^\//, '').split('?')[0] || 'postgres',
    };
  } catch {
    return null;
  }
}

function timestamp(): string {
  // 2026-05-31_14-22-09-456 (millisecond resolution so two backups created
  // in the same second — e.g. a backup immediately followed by a pre-restore
  // safety backup — never collide on filename).
  return new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace(/Z$/, '');
}

/**
 * How we will invoke a PostgreSQL client tool:
 *   - 'binary': a local executable (host install).
 *   - 'docker': run INSIDE a postgres container (no host install needed).
 */
type PgRunner =
  | { mode: 'binary'; bin: string }
  | { mode: 'docker'; container: string; tool: string };

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Find a local pg_dump binary: explicit env → PATH → common install dirs. */
function findLocalPgDump(): string | null {
  return findLocalPgBinary('pg_dump', process.env.PG_DUMP_PATH);
}

/** Find a local psql binary: explicit env → PATH → common install dirs. */
function findLocalPsql(): string | null {
  return findLocalPgBinary('psql', process.env.PSQL_PATH);
}

/**
 * Generic resolver for a PostgreSQL client binary (pg_dump / psql):
 * explicit override → PATH → common install locations.
 */
function findLocalPgBinary(name: string, explicitEnv?: string): string | null {
  // 1. Explicit override.
  const explicit = explicitEnv?.trim();
  if (explicit && fileExists(explicit)) return explicit;

  // 2. On PATH?
  try {
    const found = execSync(`command -v ${name}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: '/bin/sh',
    })
      .toString()
      .trim();
    if (found) return found;
  } catch {
    /* not on PATH */
  }

  // 3. Common macOS / Linux install locations (incl. versioned dirs).
  const candidates: string[] = [
    `/opt/homebrew/bin/${name}`, // Apple Silicon Homebrew
    `/usr/local/bin/${name}`, // Intel Homebrew / generic
    `/usr/bin/${name}`, // Linux package
  ];
  // Homebrew versioned postgresql kegs.
  for (const base of ['/opt/homebrew/opt', '/usr/local/opt']) {
    try {
      for (const d of fs.readdirSync(base)) {
        if (/^postgresql/i.test(d)) candidates.push(path.join(base, d, 'bin', name));
      }
    } catch {
      /* ignore */
    }
  }
  // Postgres.app versioned bins.
  const pgAppBase = '/Applications/Postgres.app/Contents/Versions';
  try {
    for (const v of fs.readdirSync(pgAppBase)) {
      candidates.push(path.join(pgAppBase, v, 'bin', name));
    }
  } catch {
    /* ignore */
  }

  for (const c of candidates) {
    if (fileExists(c)) return c;
  }
  return null;
}

/**
 * If the DB host is local and Postgres is running in Docker, find the
 * container so we can exec pg_dump inside it (no host install needed).
 * Honors BACKUP_DOCKER_CONTAINER when set.
 */
function findDockerPostgres(conn: ParsedDbUrl): string | null {
  // Only meaningful for a local DB.
  const localHosts = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'];
  if (!localHosts.includes(conn.host)) return null;

  // Explicit container name wins.
  const explicit = process.env.BACKUP_DOCKER_CONTAINER?.trim();

  let dockerAvailable = false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    dockerAvailable = true;
  } catch {
    return null; // docker not installed / not running
  }
  if (!dockerAvailable) return null;

  if (explicit) {
    // Validate container name: only alphanumeric, dash, underscore, dot.
    // Rejects any shell metacharacters that could enable command injection.
    if (!/^[a-zA-Z0-9_.-]+$/.test(explicit)) {
      console.warn(
        '[backup] BACKUP_DOCKER_CONTAINER contains invalid characters — ignoring. ' +
          'Only letters, digits, hyphens, underscores, and dots are allowed.',
      );
      return null;
    }
    try {
      execSync(`docker inspect ${explicit}`, { stdio: 'ignore' });
      return explicit;
    } catch {
      return null;
    }
  }

  // Find a running container that maps the DB port and has pg_dump.
  try {
    const lines = execSync('docker ps --format "{{.Names}}\t{{.Ports}}\t{{.Image}}"', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    // Prefer a container that publishes our DB port (e.g. 5434->5432).
    for (const line of lines) {
      const [name, ports, image] = line.split('\t');
      const isPg = /postgres/i.test(image || '');
      const mapsPort = (ports || '').includes(`:${conn.port}->`);
      if (isPg && mapsPort) return name;
    }
    // Fallback: any postgres image container.
    for (const line of lines) {
      const [name, , image] = line.split('\t');
      if (/postgres/i.test(image || '')) return name;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve how to run pg_dump for this connection. Returns null if neither a
 * local binary nor a Docker postgres container is available.
 */
function resolvePgDumpRunner(conn: ParsedDbUrl): PgRunner | null {
  const bin = findLocalPgDump();
  if (bin) return { mode: 'binary', bin };
  const container = findDockerPostgres(conn);
  if (container) return { mode: 'docker', container, tool: 'pg_dump' };
  return null;
}

/**
 * Resolve how to run psql (for restore). Returns null if neither a local
 * binary nor a Docker postgres container is available.
 */
function resolvePsqlRunner(conn: ParsedDbUrl): PgRunner | null {
  const bin = findLocalPsql();
  if (bin) return { mode: 'binary', bin };
  const container = findDockerPostgres(conn);
  if (container) return { mode: 'docker', container, tool: 'psql' };
  return null;
}

/**
 * Run pg_dump and stream the gzipped result to `destPath`.
 * Resolves on success; rejects with an Error (stderr tail) on failure.
 */
function runPgDump(conn: ParsedDbUrl, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const runner = resolvePgDumpRunner(conn);
    if (!runner) {
      reject(
        new Error(
          'pg_dump not found. Install PostgreSQL client tools (e.g. `brew install postgresql`), ' +
            'set PG_DUMP_PATH to the binary, or run your database in Docker so backups can use the container.',
        ),
      );
      return;
    }

    // Build command + args. For docker mode we exec inside the container and
    // connect to localhost:5432 from the container's perspective.
    let command: string;
    let args: string[];
    const dumpArgs = [
      '--no-owner',
      '--no-privileges',
      // --clean --if-exists emits DROP ... IF EXISTS before each CREATE so the
      // dump can be restored onto an existing database (idempotent restore).
      '--clean',
      '--if-exists',
      '-F', 'p', // plain SQL
    ];

    if (runner.mode === 'binary') {
      command = runner.bin;
      args = ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, ...dumpArgs];
    } else {
      // docker exec with PGPASSWORD passed via the parent process env (not
      // as a -e KEY=VALUE arg, which would expose the password in `ps aux`).
      // Docker inherits env vars listed with -e but no value from the parent.
      command = 'docker';
      args = [
        'exec',
        '-i',
        '-e', 'PGPASSWORD',   // ← no value: Docker reads from parent env
        runner.container,
        'pg_dump',
        '-h', 'localhost',
        '-p', '5432',
        '-U', conn.user,
        '-d', conn.database,
        ...dumpArgs,
      ];
    }

    const child = spawn(command, args, {
      // PGPASSWORD is in the env object (not in args), so it never appears
      // in the process argument list visible to other users via `ps aux`.
      env: { ...process.env, PGPASSWORD: conn.password },
    });

    const gzip = createGzip();
    const out = fs.createWriteStream(destPath);
    let stderr = '';
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on('error', (err) => {
      const hint =
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? runner.mode === 'docker'
            ? ' — docker not available to run pg_dump.'
            : ' — pg_dump not found. Install PostgreSQL client tools or set PG_DUMP_PATH.'
          : '';
      fail(new Error(`Failed to run pg_dump: ${err.message}${hint}`));
    });

    // Track the process exit code independently of the stream pipeline so we
    // don't miss a 'close' event that fires before the pipeline resolves.
    const exitPromise = new Promise<number>((resolveExit) => {
      child.on('close', (code) => resolveExit(code ?? 0));
    });

    // Pipe stdout → gzip → file (handles backpressure + cleanup), then
    // require a clean process exit before declaring success.
    pipeline(child.stdout, gzip, out)
      .then(async () => {
        const code = await exitPromise;
        if (settled) return;
        settled = true;
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `pg_dump exited with code ${code}`));
      })
      .catch((err) => fail(err instanceof Error ? err : new Error(String(err))));
  });
}

export type RunBackupResult =
  | { ok: true; backupId: string; filename: string; sizeBytes: number }
  | { ok: false; error: string };

/**
 * Create a database backup. Records a DatabaseBackup row throughout.
 */
export async function runBackup(input: {
  trigger: BackupTrigger;
  createdBy?: string | null;
}): Promise<RunBackupResult> {
  if (backupInProgress) {
    return { ok: false, error: 'A backup is already in progress.' };
  }

  const conn = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!conn) {
    return { ok: false, error: 'DATABASE_URL is not a valid PostgreSQL connection string.' };
  }

  backupInProgress = true;
  const startedAt = Date.now();
  const filename = `nexus-${conn.database}-${input.trigger}-${timestamp()}.sql.gz`;
  const destPath = path.join(getBackupDir(), filename);

  // Record a pending row first so a crash still leaves an audit trail.
  const row = await prisma.databaseBackup.create({
    data: {
      filename,
      trigger: input.trigger,
      status: 'pending',
      createdBy: input.createdBy ?? null,
    },
    select: { id: true },
  });

  try {
    await runPgDump(conn, destPath);

    const stat = fs.statSync(destPath);
    const durationMs = Date.now() - startedAt;

    await prisma.databaseBackup.update({
      where: { id: row.id },
      data: {
        status: 'success',
        sizeBytes: BigInt(stat.size),
        durationMs,
        completedAt: new Date(),
      },
    });

    // Prune old backups beyond retention (best-effort).
    await pruneOldBackups().catch(() => {});

    // Auto-email the backup when enabled (best-effort, never fails the backup).
    try {
      const s = await prisma.siteSettings.findUnique({
        where: { id: 'singleton' },
        select: { backupEmailEnabled: true },
      });
      if (s?.backupEmailEnabled) {
        await emailBackup({ backupId: row.id }).catch(() => {});
      }
    } catch {
      /* ignore — email is best-effort */
    }

    return { ok: true, backupId: row.id, filename, sizeBytes: stat.size };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    // Clean up partial file.
    try {
      if (fs.existsSync(destPath)) fs.rmSync(destPath);
    } catch {
      /* ignore */
    }
    await prisma.databaseBackup
      .update({
        where: { id: row.id },
        data: {
          status: 'failed',
          error: error.slice(0, 2000),
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
        },
      })
      .catch(() => {});
    return { ok: false, error };
  } finally {
    backupInProgress = false;
  }
}

/**
 * Delete successful backups beyond the configured retention count, removing
 * both the DB row and the file on disk. Failed/pending rows are ignored.
 */
export async function pruneOldBackups(): Promise<void> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { backupRetention: true },
  });
  const retention = Math.max(1, settings?.backupRetention ?? 7);

  const successful = await prisma.databaseBackup.findMany({
    where: { status: 'success' },
    orderBy: { startedAt: 'desc' },
    select: { id: true, filename: true },
  });

  const toDelete = successful.slice(retention);
  if (toDelete.length === 0) return;

  const dir = getBackupDir();
  for (const b of toDelete) {
    try {
      const f = path.join(dir, b.filename);
      if (fs.existsSync(f)) fs.rmSync(f);
    } catch {
      /* ignore file errors */
    }
  }
  await prisma.databaseBackup.deleteMany({
    where: { id: { in: toDelete.map((b) => b.id) } },
  });
}

/** Delete a single backup (row + file). */
export async function deleteBackup(id: string): Promise<{ ok: boolean; error?: string }> {
  const row = await prisma.databaseBackup.findUnique({ where: { id } });
  if (!row) return { ok: false, error: 'Backup not found' };
  try {
    const f = path.join(getBackupDir(), row.filename);
    if (fs.existsSync(f)) fs.rmSync(f);
  } catch {
    /* ignore */
  }
  await prisma.databaseBackup.delete({ where: { id } });
  return { ok: true };
}

/**
 * Re-register backup files that exist on disk but have no DatabaseBackup row.
 * This happens after a restore: the restored snapshot's table replaces the
 * current rows, orphaning files (e.g. the pre-restore safety backup) whose
 * data still sits on disk. We recreate rows so they stay visible/downloadable.
 */
export async function reconcileBackupFiles(): Promise<void> {
  const dir = getBackupDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql.gz'));
  } catch {
    return;
  }
  if (files.length === 0) return;

  const known = await prisma.databaseBackup.findMany({
    select: { id: true, filename: true, status: true },
  });
  const knownByName = new Map(known.map((k) => [k.filename, k]));
  const fileSet = new Set(files);

  // 1. Re-register files that have no row.
  for (const filename of files) {
    if (knownByName.has(filename)) continue;
    try {
      const stat = fs.statSync(path.join(dir, filename));
      const m = filename.match(/-(manual|daily|weekly|monthly|pre-restore)-/);
      await prisma.databaseBackup.create({
        data: {
          filename,
          sizeBytes: BigInt(stat.size),
          trigger: m?.[1] ?? 'manual',
          status: 'success',
          completedAt: stat.mtime,
          startedAt: stat.mtime,
        },
      });
    } catch {
      /* ignore individual file errors */
    }
  }

  // 2. Normalize rows that the restored snapshot froze in 'pending':
  //    - file exists on disk  → it actually completed → mark 'success'
  //    - file missing on disk → stale/interrupted     → mark 'failed'
  for (const row of known) {
    if (row.status !== 'pending') continue;
    try {
      if (fileSet.has(row.filename)) {
        const stat = fs.statSync(path.join(dir, row.filename));
        await prisma.databaseBackup.update({
          where: { id: row.id },
          data: { status: 'success', sizeBytes: BigInt(stat.size), completedAt: stat.mtime },
        });
      } else {
        await prisma.databaseBackup.update({
          where: { id: row.id },
          data: { status: 'failed', error: 'Interrupted (no backup file found after restore).' },
        });
      }
    } catch {
      /* ignore */
    }
  }
}

/** Resolve the absolute path of a backup file if it exists on disk. */
export function backupFilePath(filename: string): string | null {
  // Guard against path traversal — only allow a bare filename.
  if (filename.includes('/') || filename.includes('..')) return null;
  const f = path.join(getBackupDir(), filename);
  return fs.existsSync(f) ? f : null;
}

// Most SMTP providers cap message size around 25 MB. Base64 inflates by
// ~33%, so we refuse to attach files larger than this raw size.
export const MAX_EMAIL_ATTACHMENT_BYTES = 18 * 1024 * 1024; // 18 MB

export type EmailBackupResult = { ok: true } | { ok: false; error: string };

/**
 * Email a completed backup file as an attachment, sent from the configured
 * SMTP identity. Records emailedAt / emailError on the DatabaseBackup row.
 *
 * `to` overrides the recipient; otherwise uses SiteSettings.backupEmailTo,
 * then falls back to the SMTP from-address.
 */
export async function emailBackup(input: {
  backupId: string;
  to?: string | null;
}): Promise<EmailBackupResult> {
  const backup = await prisma.databaseBackup.findUnique({ where: { id: input.backupId } });
  if (!backup) return { ok: false, error: 'Backup not found' };
  if (backup.status !== 'success') return { ok: false, error: 'Only successful backups can be emailed' };

  const filePath = backupFilePath(backup.filename);
  if (!filePath) return { ok: false, error: 'Backup file is missing on disk' };

  const size = Number(backup.sizeBytes);
  if (size > MAX_EMAIL_ATTACHMENT_BYTES) {
    const err = `Backup is too large to email (${(size / 1024 / 1024).toFixed(1)} MB > ${
      MAX_EMAIL_ATTACHMENT_BYTES / 1024 / 1024
    } MB). Download it instead.`;
    await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { emailError: err },
    });
    return { ok: false, error: err };
  }

  // Resolve recipient: explicit → configured → SMTP from-address.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      backupEmailTo: true,
      smtpFromAddress: true,
      smtpEnabled: true,
      siteName: true,
    },
  });
  if (!settings?.smtpEnabled) {
    const err = 'SMTP is not enabled. Configure it in Email / SMTP settings first.';
    await prisma.databaseBackup.update({ where: { id: backup.id }, data: { emailError: err } });
    return { ok: false, error: err };
  }
  const to = (input.to ?? settings?.backupEmailTo ?? settings?.smtpFromAddress ?? '').trim();
  if (!to) {
    const err = 'No recipient configured and no SMTP from-address available.';
    await prisma.databaseBackup.update({ where: { id: backup.id }, data: { emailError: err } });
    return { ok: false, error: err };
  }

  const { sendEmail } = await import('@/lib/email/mailer');
  const siteName = settings.siteName || 'Nexus Server';
  const sizeLabel = size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
  const when = backup.completedAt ?? backup.startedAt;

  const result = await sendEmail({
    to,
    event: 'backup.created',
    force: true, // explicit admin action — never muted by the events allow-list
    subject: `[${siteName}] Database backup — ${when.toISOString().slice(0, 10)}`,
    text: [
      `A database backup for ${siteName} is attached.`,
      '',
      `File: ${backup.filename}`,
      `Size: ${sizeLabel}`,
      `Type: ${backup.trigger}`,
      `Created: ${when.toISOString()}`,
      '',
      'Keep this file secure — it contains a full copy of your database.',
    ].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">${siteName} — database backup</h2>
      <p style="margin:0 0 12px;color:#444">A database backup is attached to this email.</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:2px 12px 2px 0;color:#666">File</td><td><code>${backup.filename}</code></td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666">Size</td><td>${sizeLabel}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666">Type</td><td>${backup.trigger}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666">Created</td><td>${when.toISOString()}</td></tr>
      </table>
      <p style="margin:14px 0 0;color:#a00;font-size:13px">Keep this file secure — it contains a full copy of your database.</p>
    </div>`,
    refType: 'DatabaseBackup',
    refId: backup.id,
    attachments: [
      { filename: backup.filename, path: filePath, contentType: 'application/gzip' },
    ],
  });

  if (!result.ok) {
    const err = result.reason ?? 'Email send failed';
    await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { emailError: err },
    });
    return { ok: false, error: err };
  }

  await prisma.databaseBackup.update({
    where: { id: backup.id },
    data: { emailedAt: new Date(), emailError: null },
  });
  return { ok: true };
}

/** Compute the next scheduled run timestamp from frequency + hour. */
export function computeNextRun(
  frequency: string,
  hour: number,
  from: Date = new Date(),
): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(hour);

  // If today's slot already passed, advance.
  if (next <= from) {
    next.setDate(next.getDate() + 1);
  }

  if (frequency === 'weekly') {
    // Run on Mondays.
    while (next.getDay() !== 1) next.setDate(next.getDate() + 1);
  } else if (frequency === 'monthly') {
    // Run on the 1st of the month.
    if (next.getDate() !== 1) {
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(hour, 0, 0, 0);
    }
  }
  return next;
}

// ─── Restore / Import ───────────────────────────────────────────

let restoreInProgress = false;

export function isRestoreInProgress(): boolean {
  return restoreInProgress;
}

export type RestoreResult =
  | { ok: true; safetyBackupId: string | null }
  | { ok: false; error: string; safetyBackupId?: string | null };

/**
 * Gunzip a backup file to plain SQL text (for validation / restore).
 * Returns null if the file is not a valid gzip.
 */
function gunzipToString(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      const input = fs.createReadStream(filePath);
      gunzip.on('data', (c: Buffer) => chunks.push(c));
      gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      gunzip.on('error', () => resolve(null));
      input.on('error', () => resolve(null));
      input.pipe(gunzip);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Quick sanity check that a decompressed payload looks like a pg_dump plain
 * SQL dump. We don't fully parse it — just look for hallmark statements.
 */
function looksLikePgDump(sql: string): boolean {
  const head = sql.slice(0, 4000);
  return (
    /PostgreSQL database dump/i.test(head) ||
    /SET\s+statement_timeout/i.test(head) ||
    /CREATE TABLE/i.test(sql)
  );
}

/**
 * Pipe SQL text into psql (local binary or docker container), restoring into
 * the target database. Resolves on a clean exit, rejects with stderr tail.
 */
function runPsqlRestore(conn: ParsedDbUrl, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const runner = resolvePsqlRunner(conn);
    if (!runner) {
      reject(
        new Error(
          'psql not found. Install PostgreSQL client tools (e.g. `brew install postgresql`), ' +
            'set PSQL_PATH to the binary, or run your database in Docker so restore can use the container.',
        ),
      );
      return;
    }

    let command: string;
    let args: string[];
    // -v ON_ERROR_STOP=1 → abort on the first error so a half-applied dump
    // surfaces as a failure (then we can offer the safety backup).
    // --single-transaction → all-or-nothing restore.
    const psqlArgs = [
      '-v', 'ON_ERROR_STOP=1',
      '--single-transaction',
      '-U', conn.user,
      '-d', conn.database,
    ];

    if (runner.mode === 'binary') {
      command = runner.bin;
      args = ['-h', conn.host, '-p', conn.port, ...psqlArgs];
    } else {
      command = 'docker';
      args = [
        'exec',
        '-i', // keep stdin open so we can pipe SQL in
        '-e', 'PGPASSWORD',   // ← no value: Docker reads from parent env
        runner.container,
        'psql',
        '-h', 'localhost',
        '-p', '5432',
        ...psqlArgs,
      ];
    }

    const child = spawn(command, args, {
      // PGPASSWORD in env object only — never in args (not visible in ps aux).
      env: { ...process.env, PGPASSWORD: conn.password },
    });

    let stderr = '';
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });

    child.on('error', (err) => {
      const hint =
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? runner.mode === 'docker'
            ? ' — docker not available to run psql.'
            : ' — psql not found. Install PostgreSQL client tools or set PSQL_PATH.'
          : '';
      fail(new Error(`Failed to run psql: ${err.message}${hint}`));
    });

    const exitPromise = new Promise<number>((resolveExit) => {
      child.on('close', (code) => resolveExit(code ?? 0));
    });

    // Feed the SQL into psql's stdin.
    pipeline(Readable.from(sql), child.stdin)
      .then(async () => {
        const code = await exitPromise;
        if (settled) return;
        settled = true;
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `psql exited with code ${code}`));
      })
      .catch((err) => fail(err instanceof Error ? err : new Error(String(err))));
  });
}

/**
 * Restore the database from a gzipped pg_dump file.
 *
 * SAFETY: this OVERWRITES the current database. Before applying the restore
 * we take an automatic safety backup (trigger 'manual', filename prefixed
 * 'pre-restore') so the admin can roll back a mistaken restore.
 *
 * @param filePath absolute path to a .sql.gz file on disk (already validated
 *   to live under BACKUP_DIR or a temp upload location by the caller).
 */
export async function restoreFromFile(input: {
  filePath: string;
  sourceLabel: string; // for logging/UI (e.g. original filename)
  createdBy?: string | null;
}): Promise<RestoreResult> {
  if (backupInProgress || restoreInProgress) {
    return { ok: false, error: 'Another backup/restore operation is in progress.' };
  }

  const conn = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!conn) {
    return { ok: false, error: 'DATABASE_URL is not a valid PostgreSQL connection string.' };
  }

  if (!fs.existsSync(input.filePath)) {
    return { ok: false, error: 'Backup file not found.' };
  }

  // Validate it is a real gzipped pg_dump before we touch anything.
  const sql = await gunzipToString(input.filePath);
  if (sql === null) {
    return { ok: false, error: 'File is not a valid .gz archive.' };
  }
  if (!looksLikePgDump(sql)) {
    return { ok: false, error: 'File does not look like a PostgreSQL backup (pg_dump SQL).' };
  }

  restoreInProgress = true;
  let safetyBackupId: string | null = null;
  try {
    // 1. Safety backup of the CURRENT state (best-effort but important).
    const safety = await (async () => {
      // Temporarily release the lock guard for runBackup's own check.
      restoreInProgress = false;
      try {
        return await runBackup({ trigger: 'manual', createdBy: input.createdBy ?? null });
      } finally {
        restoreInProgress = true;
      }
    })();
    if (safety.ok) {
      safetyBackupId = safety.backupId;
      // Tag it so the UI can show it was a pre-restore snapshot.
      await prisma.databaseBackup
        .update({ where: { id: safety.backupId }, data: { trigger: 'pre-restore' } })
        .catch(() => {});
    }

    // 2. Apply the restore.
    await runPsqlRestore(conn, sql);

    // 3. The restore overwrote the DatabaseBackup table with the snapshot's
    //    rows, so the safety backup (and any backups taken after the restored
    //    snapshot) lost their DB rows while their FILES still exist on disk.
    //    Re-register orphan files so they remain visible + downloadable.
    await reconcileBackupFiles().catch(() => {});

    return { ok: true, safetyBackupId };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error, safetyBackupId };
  } finally {
    restoreInProgress = false;
  }
}
