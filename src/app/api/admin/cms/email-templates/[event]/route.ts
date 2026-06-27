import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { resetEmailTemplate } from '@/lib/email/template-store';
import { EDITABLE_EMAIL_TEMPLATES } from '@/lib/email/template-defs';
import type { EmailEvent } from '@/lib/email/types';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  subject: z.string().min(1).max(300),
  bodyText: z.string().min(1).max(20_000),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ event: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { event } = await params;
  const def = EDITABLE_EMAIL_TEMPLATES.find((d) => d.event === event);
  if (!def) return NextResponse.json({ error: 'Unknown template' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  await prisma.emailTemplate.upsert({
    where: { event },
    update: {
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
    },
    create: {
      event,
      label: def.label,
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
      description: def.description,
    },
  });

  await logActivity({
    userId: session?.user.id,
    action: 'email.template_updated',
    entity: 'EmailTemplate',
    entityId: event,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ event: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { event } = await params;
  if (!EDITABLE_EMAIL_TEMPLATES.some((d) => d.event === event)) {
    return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
  }

  await resetEmailTemplate(event as EmailEvent);

  await logActivity({
    userId: session?.user.id,
    action: 'email.template_reset',
    entity: 'EmailTemplate',
    entityId: event,
  });

  return NextResponse.json({ ok: true });
}
