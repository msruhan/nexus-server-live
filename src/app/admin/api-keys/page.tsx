import { PageHeader } from '@/components/ui/PageHeader';
import { ApiKeysManager } from '@/components/account/ApiKeysManager';

export const dynamic = 'force-dynamic';

export default function AdminApiKeysPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        section="§ Admin · Security"
        title={
          <>
            API <span className="font-serif italic font-normal">keys</span>.
          </>
        }
        subtitle="Manage API keys for integrations and automation."
      />
      <ApiKeysManager />
    </div>
  );
}
