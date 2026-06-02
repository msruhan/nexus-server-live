/**
 * SMTP mailer.
 *
 * Design rules:
 *   1. NEVER fail the originating action because of an email problem.
 *      Every send is fire-and-forget for the caller; failures get logged
 *      to EmailLog with attempts/lastError so admin can debug later.
 *   2. With smtpEnabled=false (default), `sendEmail` is a no-op that
 *      returns ok=false silently. This means existing deployments keep
 *      working unchanged until an admin opts in.
 *   3. The transporter is created lazily and cached for the life of the
 *      Node.js process. Settings changes require a process restart OR a
 *      manual `resetTransporter()` call (we expose it for the admin
 *      "Send test email" button).
 *   4. We honor the per-event allow-list (smtpEvents). Empty = all on.
 */
import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { prisma } from '@/lib/db';
import type { EmailEvent, EmailMessage } from './types';

type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
  events: string[]; // empty = all
};

let cachedTransporter: Transporter | null = null;
let cachedConfig: SmtpConfig | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // re-read settings at most once per minute

async function loadConfig(): Promise<SmtpConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }
  const row = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      smtpEnabled: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUsername: true,
      smtpPassword: true,
      smtpFromAddress: true,
      smtpFromName: true,
      smtpEvents: true,
    },
  });
  if (!row) {
    cachedConfig = null;
    cacheLoadedAt = now;
    return null;
  }
  if (!row.smtpEnabled || !row.smtpHost || !row.smtpFromAddress) {
    cachedConfig = {
      enabled: false,
      host: '',
      port: 0,
      secure: false,
      user: '',
      pass: '',
      fromAddress: '',
      fromName: '',
      events: [],
    };
    cacheLoadedAt = now;
    return cachedConfig;
  }
  cachedConfig = {
    enabled: true,
    host: row.smtpHost,
    port: row.smtpPort ?? 587,
    secure: row.smtpSecure,
    user: row.smtpUsername ?? '',
    pass: row.smtpPassword ?? '',
    fromAddress: row.smtpFromAddress,
    fromName: row.smtpFromName ?? '',
    events: (row.smtpEvents ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  cacheLoadedAt = now;
  return cachedConfig;
}

function buildTransporter(cfg: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
}

/** Drop the cached transporter+config so the next send re-reads settings. */
export function resetTransporter() {
  cachedTransporter?.close();
  cachedTransporter = null;
  cachedConfig = null;
  cacheLoadedAt = 0;
}

function eventAllowed(event: EmailEvent, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  return allowlist.includes(event);
}

/**
 * Best-effort send. Always logs to EmailLog. Returns the row id if the
 * caller wants to poll the status (used by the admin "test email" button).
 */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; logId: string | null; reason?: string }> {
  // Insert log row first so we have an audit even if everything fails.
  let log = null as null | { id: string };
  try {
    log = await prisma.emailLog.create({
      data: {
        toAddress: msg.to,
        subject: msg.subject,
        event: msg.event,
        bodyText: msg.text ?? null,
        bodyHtml: msg.html ?? null,
        refType: msg.refType ?? null,
        refId: msg.refId ?? null,
      },
      select: { id: true },
    });
  } catch (e) {
    console.error('[email] failed to create log row', e);
  }

  let cfg: SmtpConfig | null;
  try {
    cfg = await loadConfig();
  } catch (e) {
    console.error('[email] failed to load config', e);
    if (log) {
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: { status: 'FAILED', lastError: 'config_load_failed' },
        })
        .catch(() => {});
    }
    return { ok: false, logId: log?.id ?? null, reason: 'config_load_failed' };
  }

  if (!cfg || !cfg.enabled) {
    if (log) {
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: { status: 'FAILED', lastError: 'smtp_disabled' },
        })
        .catch(() => {});
    }
    return { ok: false, logId: log?.id ?? null, reason: 'smtp_disabled' };
  }

  if (!eventAllowed(msg.event, cfg.events) && !msg.force) {
    if (log) {
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: { status: 'FAILED', lastError: 'event_excluded' },
        })
        .catch(() => {});
    }
    return { ok: false, logId: log?.id ?? null, reason: 'event_excluded' };
  }

  if (!cachedTransporter) cachedTransporter = buildTransporter(cfg);

  const opts: SendMailOptions = {
    from: cfg.fromName ? `${cfg.fromName} <${cfg.fromAddress}>` : cfg.fromAddress,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    attachments: msg.attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
      content: a.content,
      contentType: a.contentType,
    })),
  };

  try {
    await cachedTransporter.sendMail(opts);
    if (log) {
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: { status: 'SENT', sentAt: new Date(), attempts: 1 },
        })
        .catch(() => {});
    }
    return { ok: true, logId: log?.id ?? null };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'send_failed';
    console.error('[email] sendMail failed', reason);
    if (log) {
      await prisma.emailLog
        .update({
          where: { id: log.id },
          data: { status: 'FAILED', attempts: 1, lastError: reason.slice(0, 1000) },
        })
        .catch(() => {});
    }
    // Drop transporter so a transient SMTP error doesn't poison the next call.
    resetTransporter();
    return { ok: false, logId: log?.id ?? null, reason };
  }
}

/**
 * Verify SMTP credentials by attempting to connect. Used by the admin
 * "Test connection" button before saving settings.
 */
export async function verifySmtp(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; error?: string }> {
  const t = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: opts.user ? { user: opts.user, pass: opts.pass } : undefined,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
  try {
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify_failed' };
  } finally {
    t.close();
  }
}
