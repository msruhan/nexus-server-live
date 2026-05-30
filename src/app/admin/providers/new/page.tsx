import Link from 'next/link';
import { ProviderForm } from '../[id]/ProviderForm';

export default function NewProviderPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/providers" className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
        ← Providers
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
        New <span className="font-serif italic font-normal">provider</span>.
      </h1>
      <p className="mt-3 font-serif italic text-ink-muted">
        Configure an upstream DhruFusion connection. Test the link before activating it.
      </p>
      <div className="mt-8">
        <ProviderForm />
      </div>
    </div>
  );
}
