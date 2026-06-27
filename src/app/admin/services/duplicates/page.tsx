import { PageHeader } from '@/components/ui/PageHeader';
import { DuplicatesView } from './DuplicatesView';

export const dynamic = 'force-dynamic';

export default function DuplicatesPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        section="§ Admin · Services"
        title={
          <>
            Duplicate <span className="font-serif italic font-normal">detector</span>
          </>
        }
        subtitle="Find catalog entries with the same supplier toolId or matching titles."
      />
      <div className="mt-8">
        <DuplicatesView />
      </div>
    </div>
  );
}
