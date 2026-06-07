import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/** Legacy URL — online top-up lives on the wallet page. */
export default async function OnlineTopupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/user/wallet/topup-online');
  redirect('/user/wallet#topup');
}
