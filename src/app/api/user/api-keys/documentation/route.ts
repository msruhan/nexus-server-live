import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { getBranding } from '@/lib/branding';
import { buildApiDocumentationPdf } from '@/lib/api-documentation-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  if (host) return `${proto}://${host}`;
  return 'http://localhost:3000';
}

/** GET — download Nexus Server API documentation PDF (authenticated users & admins). */
export async function GET(req: Request) {
  const { error } = await requireApiAuth();
  if (error) return error;

  try {
    const baseUrl = resolveBaseUrl(req);
    const brand = await getBranding();
    const pdf = await buildApiDocumentationPdf(baseUrl, brand.siteName);
    const filename = `nexus-server-api-documentation-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[API_KEYS_DOCUMENTATION_PDF]', e);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? `Failed to generate PDF: ${message}`
            : 'Failed to generate PDF',
      },
      { status: 500 },
    );
  }
}
