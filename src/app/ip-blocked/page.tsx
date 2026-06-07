import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default function IpBlockedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <PageHeader
        section="§ Access denied"
        title={
          <>
            IP <span className="font-serif italic font-normal">blocked</span>.
          </>
        }
        subtitle="Your IP address is not permitted to access this site. Contact the administrator if you believe this is a mistake."
      />
    </div>
  );
}
