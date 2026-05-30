import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { resetToDefaults } from '@/lib/cms-defaults';
import { logActivity } from '@/lib/activity';

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const pageSlug = url.searchParams.get('page') ?? 'home';
  await resetToDefaults(pageSlug);
  await logActivity({
    userId: session?.user.id,
    action: 'cms.sections_reset',
    entity: 'PageSection',
    metadata: { pageSlug },
  });
  return NextResponse.json({ ok: true });
}
