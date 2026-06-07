import { redirect } from 'next/navigation';
import { RegisterForm } from './RegisterForm';
import { getLicenseEnforcementState, isLicenseRuntimeLocked } from '@/lib/license-state';

export default async function RegisterPage() {
  const licenseState = await getLicenseEnforcementState();
  if (isLicenseRuntimeLocked(licenseState)) {
    redirect('/license-suspended');
  }
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
        § Open account
      </span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-5xl">
        Pull up <span className="font-serif italic font-normal">a chair</span>.
      </h1>
      <p className="mt-3 font-serif text-base italic text-ink-muted">
        Thirty seconds. Wallet activates the moment your top-up clears.
      </p>

      <div className="mt-10">
        <RegisterForm />
      </div>
    </div>
  );
}
