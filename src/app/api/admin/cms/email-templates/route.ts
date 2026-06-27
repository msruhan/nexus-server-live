import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { listEmailTemplates } from '@/lib/email/template-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const templates = await listEmailTemplates();
  return NextResponse.json({ ok: true, templates });
}
