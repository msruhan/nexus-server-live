import { PageHeader } from '@/components/ui/PageHeader';
import { ApiKeysManager } from '@/components/account/ApiKeysManager';

export const dynamic = 'force-dynamic';

export default function UserApiKeysPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        section="§ Account"
        title={
          <>
            API <span className="font-serif italic font-normal">keys</span>.
          </>
        }
        subtitle="Generate and manage API keys for external website integrations."
      />
      <ApiKeysManager />
    </div>
  );
}
