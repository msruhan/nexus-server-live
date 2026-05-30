import { getUserPaletteCss } from '@/lib/active-palette';

/** Applies the signed-in user's palette to dashboard chrome (sidebar, pages). */
export async function AccountThemeShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const paletteCss = await getUserPaletteCss(userId);

  return (
    <>
      <style
        id={`account-palette-${userId}`}
        dangerouslySetInnerHTML={{ __html: `[data-account-theme]{${paletteCss}}` }}
      />
      <div data-account-theme className="min-h-screen">
        {children}
      </div>
    </>
  );
}
