import { prisma } from '@/lib/db';
import { getAnalyticsSummary } from '@/lib/analytics';
import { sendEmail } from '@/lib/email/mailer';

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function computeNextReportRun(
  frequency: string,
  hour: number,
  from: Date = new Date(),
): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(hour);
  if (next <= from) next.setDate(next.getDate() + 1);
  if (frequency === 'weekly') {
    while (next.getDay() !== 1) next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function runScheduledReportEmail(): Promise<{ ok: boolean; reason?: string }> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      reportEmailEnabled: true,
      reportEmailTo: true,
      reportEmailFrequency: true,
      reportEmailHour: true,
      reportEmailNextRunAt: true,
      adminNotificationEmail: true,
      supportEmail: true,
      smtpFromAddress: true,
      siteName: true,
    },
  });

  if (!settings?.reportEmailEnabled) return { ok: true, reason: 'disabled' };

  const to =
    settings.reportEmailTo?.trim() ||
    settings.adminNotificationEmail?.trim() ||
    settings.supportEmail?.trim() ||
    settings.smtpFromAddress?.trim();
  if (!to) return { ok: false, reason: 'no_recipient' };

  const now = new Date();
  const frequency = settings.reportEmailFrequency === 'daily' ? 'daily' : 'weekly';
  const hour = settings.reportEmailHour ?? 8;

  if (!settings.reportEmailNextRunAt) {
    await prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { reportEmailNextRunAt: computeNextReportRun(frequency, hour, now) },
    });
    return { ok: true, reason: 'scheduled' };
  }

  if (settings.reportEmailNextRunAt > now) return { ok: true, reason: 'not_due' };

  const period = frequency === 'daily' ? '24h' : '7d';
  const summary = await getAnalyticsSummary(period);
  const siteName = settings.siteName ?? 'Recovero';
  const label = frequency === 'daily' ? 'Daily' : 'Weekly';

  const text = `${label} analytics report — ${siteName}

Period: ${summary.range.from.slice(0, 10)} → ${summary.range.to.slice(0, 10)}

Revenue
  IMEI:   ${fmtUsd(summary.revenue.imei)}
  Server: ${fmtUsd(summary.revenue.server)}
  Total:  ${fmtUsd(summary.revenue.total)}

Profit (where cost tracked)
  Total:  ${fmtUsd(summary.profit.total)}
  Margin: ${pct(summary.profit.marginPercent)}

Orders
  Total:   ${summary.orders.total}
  Success: ${summary.orders.success}
  Rate:    ${pct(summary.orders.successRate)}

Top-ups: ${summary.topups.count} · ${fmtUsd(summary.topups.total)}

Open admin reports for full CSV export.`;

  const html = `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.6;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`;

  const result = await sendEmail({
    to,
    subject: `${label} report — ${siteName}`,
    text,
    html,
    event: 'admin.report.scheduled',
  });

  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      reportEmailLastSentAt: now,
      reportEmailNextRunAt: computeNextReportRun(frequency, hour, new Date(now.getTime() + 60_000)),
    },
  });

  if (!result.ok) return { ok: false, reason: result.reason ?? 'send_failed' };
  return { ok: true };
}
