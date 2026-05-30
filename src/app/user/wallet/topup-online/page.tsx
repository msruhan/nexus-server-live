import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listEnabledGateways } from '@/lib/payment/registry';
import { PageHeader } from '@/components/ui/PageHeader';
import { OnlineTopupForm } from './OnlineTopupForm';

export const dynamic = 'force-dynamic';

export default async function OnlineTopupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/user/wallet/topup-online');

  const gateways = await listEnabledGateways();

  if (gateways.length === 0) {
    return (
      <div className="max-w-2xl">
        <PageHeader
          section="§ Wallet · top-up online"
          title={
            <>
              Online <span className="font-serif italic font-normal">top-up</span>.
            </>
          }
          subtitle="No online gateways are enabled. Use the manual top-up form on the wallet page."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Wallet · top-up online"
        title={
          <>
            Online <span className="font-serif italic font-normal">top-up</span>.
          </>
        }
        subtitle="Crypto credits instantly on confirmation. Card payments may take a few minutes."
      />
      <OnlineTopupForm gateways={gateways} />
    </div>
  );
}
