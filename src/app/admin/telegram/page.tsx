import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { TELEGRAM_USER_EVENTS, TELEGRAM_ADMIN_EVENTS } from '@/lib/telegram/types';
import { TelegramSettingsForm } from './TelegramSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminTelegramPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      telegramBotEnabled: true,
      telegramBotToken: true,
      telegramBotUsername: true,
      telegramAdminChatId: true,
      telegramChannelId: true,
      telegramChannelEnabled: true,
      telegramGroupId: true,
      telegramGroupTopicId: true,
      telegramGroupEnabled: true,
      telegramUserEvents: true,
      telegramAdminEvents: true,
    },
  });

  // Count linked users
  const linkedUsersCount = await prisma.user.count({
    where: { telegramChatId: { not: null } },
  });

  // Resolve event allow-lists for the UI.
  // DB null → all enabled (return all keys checked).
  // DB "none" → all disabled (return empty).
  // DB "a,b" → those keys checked.
  const allUserKeys = TELEGRAM_USER_EVENTS.map((e) => e.key);
  const allAdminKeys = TELEGRAM_ADMIN_EVENTS.map((e) => e.key);

  const resolveChecked = (val: string | null | undefined, allKeys: string[]): string[] => {
    if (val === null || val === undefined) return allKeys; // all enabled (default)
    const list = val.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes('none')) return []; // explicitly all disabled
    return list;
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        section="§ Admin · telegram"
        title={
          <>
            Telegram <span className="font-serif italic font-normal">bot</span>.
          </>
        }
        subtitle="Configure Telegram bot for notifications, user commands, channel auto-posts, and group topic auto-posts."
      />
      <TelegramSettingsForm
        initial={{
          telegramBotEnabled: settings?.telegramBotEnabled ?? false,
          telegramBotToken: settings?.telegramBotToken ? '••••••' + settings.telegramBotToken.slice(-8) : '',
          telegramBotUsername: settings?.telegramBotUsername ?? '',
          telegramAdminChatId: settings?.telegramAdminChatId ?? '',
          telegramChannelId: settings?.telegramChannelId ?? '',
          telegramChannelEnabled: settings?.telegramChannelEnabled ?? false,
          telegramGroupId: settings?.telegramGroupId ?? '',
          telegramGroupTopicId:
            settings?.telegramGroupTopicId != null ? String(settings.telegramGroupTopicId) : '',
          telegramGroupEnabled: settings?.telegramGroupEnabled ?? false,
          hasToken: !!settings?.telegramBotToken,
          userEvents: resolveChecked(settings?.telegramUserEvents, allUserKeys),
          adminEvents: resolveChecked(settings?.telegramAdminEvents, allAdminKeys),
        }}
        userEventCatalog={TELEGRAM_USER_EVENTS}
        adminEventCatalog={TELEGRAM_ADMIN_EVENTS}
        linkedUsersCount={linkedUsersCount}
      />
    </div>
  );
}
