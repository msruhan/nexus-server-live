import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserPaletteSummary } from '@/lib/active-palette';
import { PALETTE_TEMPLATES } from '@/lib/palettes';
import { PageHeader } from '@/components/ui/PageHeader';
import { PaletteEditor } from '@/app/admin/cms/palette/PaletteEditor';

export async function AppearancePanel({ variant }: { variant: 'user' | 'admin' }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(variant === 'admin' ? '/login?next=/admin/appearance' : '/login?next=/user/appearance');
  }

  const active = await getUserPaletteSummary(session.user.id);

  return (
    <div>
      <PageHeader
        section={variant === 'user' ? '§ Member · appearance' : '§ Admin · appearance'}
        title={
          <>
            Palette &amp; <span className="font-serif italic font-normal">theme</span>.
          </>
        }
        subtitle={
          variant === 'user'
            ? 'Choose a template or fine-tune colors. Saved to your account only — other members and admins keep their own theme.'
            : 'Pick a curated template or override tokens. Applies to your admin desk only; members and the public site are unaffected.'
        }
      />
      <PaletteEditor
        templates={PALETTE_TEMPLATES}
        activeTemplateId={active.templateId}
        custom={active.custom}
        saveTarget="account"
      />
    </div>
  );
}
