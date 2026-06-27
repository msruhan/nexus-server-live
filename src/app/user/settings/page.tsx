import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';
import { TwoFactorForm } from './TwoFactorForm';
import { TelegramLinkForm } from './TelegramLinkForm';
import { PushNotificationForm } from './PushNotificationForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });

  return (
    <div className="max-w-3xl">
      <PageHeader
        section="§ Settings"
        title={
          <>
            Account &amp; <span className="font-serif italic font-normal">security</span>.
          </>
        }
        subtitle="Update your profile, password, and two-factor authentication."
      />

      <section className="space-y-12">
        <div>
          <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
            Profile
          </h2>
          <div className="mt-6">
            <ProfileForm initialName={user?.name ?? ''} email={user?.email ?? ''} />
          </div>
        </div>

        <div>
          <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
            Change password
          </h2>
          <div className="mt-6">
            <PasswordForm />
          </div>
        </div>

        <div>
          <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
            Two-factor authentication
          </h2>
          <div className="mt-6">
            <TwoFactorForm initialEnabled={user?.twoFactorEnabled ?? false} />
          </div>
        </div>

        <div>
          <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
            Telegram
          </h2>
          <div className="mt-6">
            <TelegramLinkForm />
          </div>
        </div>

        <div>
          <h2 className="border-b border-ink/15 pb-3 font-display text-lg font-extrabold tracking-tight text-ink">
            Push notifications
          </h2>
          <div className="mt-6">
            <PushNotificationForm />
          </div>
        </div>
      </section>
    </div>
  );
}
