import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { DiscordSettingsForm } from './DiscordSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminDiscordPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      discordWebhookEnabled: true,
      discordWebhookUrl: true,
    },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Admin · Notifications"
        title={
          <>
            Discord <span className="font-serif italic font-normal">webhook</span>.
          </>
        }
        subtitle="Configure Discord channel notifications for new services and price updates."
      />

      <DiscordSettingsForm
        initial={{
          discordWebhookEnabled: settings?.discordWebhookEnabled ?? false,
          discordWebhookUrl: settings?.discordWebhookUrl ?? '',
        }}
      />
    </div>
  );
}
