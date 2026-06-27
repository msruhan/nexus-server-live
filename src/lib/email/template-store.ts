import { prisma } from '@/lib/db';
import type { EmailEvent } from './types';
import {
  EDITABLE_EMAIL_TEMPLATES,
  renderCustomEmail,
  type EditableEmailTemplateDef,
} from './template-defs';

export async function ensureEmailTemplates(): Promise<void> {
  for (const def of EDITABLE_EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { event: def.event },
      update: {},
      create: {
        event: def.event,
        label: def.label,
        subject: def.subject,
        bodyText: def.bodyText,
        description: def.description,
      },
    });
  }
}

export async function listEmailTemplates(): Promise<
  Array<EditableEmailTemplateDef & { id: string; updatedAt: Date }>
> {
  await ensureEmailTemplates();
  const rows = await prisma.emailTemplate.findMany({ orderBy: { label: 'asc' } });
  const byEvent = new Map(rows.map((r) => [r.event, r]));
  return EDITABLE_EMAIL_TEMPLATES.map((def) => {
    const row = byEvent.get(def.event)!;
    return {
      ...def,
      id: row.id,
      subject: row.subject,
      bodyText: row.bodyText,
      description: row.description ?? def.description,
      updatedAt: row.updatedAt,
    };
  });
}

export async function resolveEmailContent(
  event: EmailEvent,
  vars: Record<string, string>,
  fallback: () => { subject: string; text: string; html: string },
): Promise<{ subject: string; text: string; html: string }> {
  const row = await prisma.emailTemplate.findUnique({ where: { event } });
  if (!row) return fallback();
  return renderCustomEmail(row.subject, row.bodyText, vars);
}

export async function resetEmailTemplate(event: EmailEvent): Promise<void> {
  const def = EDITABLE_EMAIL_TEMPLATES.find((d) => d.event === event);
  if (!def) return;
  await prisma.emailTemplate.upsert({
    where: { event },
    update: {
      label: def.label,
      subject: def.subject,
      bodyText: def.bodyText,
      description: def.description,
    },
    create: {
      event: def.event,
      label: def.label,
      subject: def.subject,
      bodyText: def.bodyText,
      description: def.description,
    },
  });
}
