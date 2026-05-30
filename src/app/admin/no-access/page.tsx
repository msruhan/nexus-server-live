import Link from 'next/link';
import { ShieldWarning } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 text-amber-950">
        <div className="flex items-center gap-3">
          <ShieldWarning size={28} weight="fill" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Access denied</h1>
        </div>
        <p className="mt-3 font-serif italic">
          Your sub-admin account doesn&rsquo;t have permission to view this page. Contact a full
          admin if you believe you should have access.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-primary-600"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
