import { listEmailTemplates } from '@/lib/email/template-store';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmailTemplatesEditor } from './EmailTemplatesEditor';

export const dynamic = 'force-dynamic';

export default async function EmailTemplatesPage() {
  const templates = await listEmailTemplates();

  return (
    <div className="max-w-5xl">
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Email <span className="font-serif italic font-normal">templates</span>.
          </>
        }
        subtitle="Customize subject and body for order, wallet, and ticket notifications. Use {{placeholders}} — no deploy required."
      />
      <EmailTemplatesEditor
        initial={templates.map((t) => ({
          ...t,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
