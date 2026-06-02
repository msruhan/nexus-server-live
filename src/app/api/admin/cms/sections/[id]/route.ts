import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-guard';
import { logActivity } from '@/lib/activity';
import { sectionSettingsSchema, isValidVariant, hasVariants } from '@/lib/cms-style';

const schema = z
  .object({
    title: z.string().nullable().optional(),
    subtitle: z.string().nullable().optional(),
    content: z.unknown().optional(),
    settings: sectionSettingsSchema.optional(),
    isVisible: z.boolean().optional(),
  })
  .strict();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  // If a variant is supplied, validate it against this section's type.
  if (parsed.data.settings?.variant) {
    const existing = await prisma.pageSection.findUnique({
      where: { id },
      select: { sectionType: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const variant = parsed.data.settings.variant;
    // Only sections with a variant catalog accept a variant; and it must be defined.
    if (!hasVariants(existing.sectionType) || !isValidVariant(existing.sectionType, variant)) {
      return NextResponse.json(
        { error: `Invalid variant "${variant}" for section type "${existing.sectionType}"` },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.subtitle !== undefined) data.subtitle = parsed.data.subtitle;
  if (parsed.data.content !== undefined) data.content = JSON.stringify(parsed.data.content);
  if (parsed.data.settings !== undefined) data.settings = JSON.stringify(parsed.data.settings);
  if (parsed.data.isVisible !== undefined) data.isVisible = parsed.data.isVisible;

  await prisma.pageSection.update({ where: { id }, data });
  await logActivity({
    userId: session?.user.id,
    action: 'cms.section_updated',
    entity: 'PageSection',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.pageSection.delete({ where: { id } });
  await logActivity({
    userId: session?.user.id,
    action: 'cms.section_deleted',
    entity: 'PageSection',
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
