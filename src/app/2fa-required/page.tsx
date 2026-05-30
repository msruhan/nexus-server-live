import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ShieldWarning } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

/**
 * Admin landing when the org has enforced 2FA and the admin hasn't enabled
 * it yet. Renders outside /admin/* so we don't recurse via the layout
 * redirect. The admin can either go enable 2FA (link) or sign out.
 */
export default async function TwoFaRequiredPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/admin/dashboard');
  if (session.user.role !== 'ADMIN') redirect('/user/dashboard');

  // If they already have 2FA on, send them straight to admin.
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });
  if (fresh?.twoFactorEnabled) redirect('/admin/dashboard');

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="max-w-lg rounded-2xl border border-amber-300 bg-amber-50 p-8 text-amber-950">
        <div className="flex items-center gap-3">
          <ShieldWarning size={28} weight="fill" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">2FA required for admins</h1>
        </div>
        <p className="mt-3 font-serif italic">
          This site enforces two-factor authentication for admin accounts. Enable it before you can
          access the admin area.
        </p>
        <ol className="mt-4 list-decimal pl-5 text-sm">
          <li>Open your settings page below.</li>
          <li>
            Scan the QR with Google Authenticator (or any RFC 6238 TOTP app) and enter the 6-digit
            code.
          </li>
          <li>Save the backup codes somewhere safe.</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/user/settings#two-factor"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-primary-600"
          >
            Set up 2FA now
          </Link>
          <a
            href="/api/auth/signout"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
