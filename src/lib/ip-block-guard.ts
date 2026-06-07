import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getClientIpFromHeaders, isIpBlocked } from '@/lib/global-ip-policy';

/** Redirect blocked visitors away from normal site pages. */
export async function guardAgainstBlockedIp() {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  if (pathname === '/ip-blocked' || pathname.startsWith('/api')) return;

  const ip = getClientIpFromHeaders(h);
  if (await isIpBlocked(ip)) {
    redirect('/ip-blocked');
  }
}
