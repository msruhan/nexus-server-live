'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Step = 'idle' | 'setup' | 'disable';

export function TwoFactorForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [step, setStep] = React.useState<Step>('idle');
  const [loading, setLoading] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [totpCode, setTotpCode] = React.useState('');
  const [disablePassword, setDisablePassword] = React.useState('');
  const [backupCodes, setBackupCodes] = React.useState<string[] | null>(null);

  async function startSetup() {
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/setup', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error('Setup failed', { description: json.error ?? 'Unknown error' });
        return;
      }
      setQrDataUrl(json.data.qrDataUrl);
      setStep('setup');
      setTotpCode('');
    } catch {
      toast.error('Setup failed');
    } finally {
      setLoading(false);
    }
  }

  async function enable2fa() {
    if (totpCode.length !== 6) {
      toast.error('Enter a 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error('Verification failed', { description: json.error ?? 'Invalid code' });
        return;
      }
      setEnabled(true);
      setStep('idle');
      setQrDataUrl(null);
      setTotpCode('');
      setBackupCodes(json.data.backupCodes ?? null);
      toast.success('2FA enabled', {
        description: 'Save your backup codes — they are shown only once.',
      });
    } catch {
      toast.error('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  }

  async function disable2fa() {
    setLoading(true);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: totpCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error('Failed to disable', { description: json.error ?? 'Invalid credentials' });
        return;
      }
      setEnabled(false);
      setStep('idle');
      setDisablePassword('');
      setTotpCode('');
      setBackupCodes(null);
      toast.success('2FA disabled');
    } catch {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  }

  async function cancelSetup() {
    await fetch('/api/user/2fa/cancel-setup', { method: 'POST' });
    setStep('idle');
    setQrDataUrl(null);
    setTotpCode('');
  }

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-paper-50">
            <ShieldCheck size={20} weight="fill" />
          </div>
          <div>
            <h3 className="font-display text-base font-extrabold tracking-tight text-ink">
              Google Authenticator (2FA)
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Scan a QR code with Google Authenticator for a 6-digit login code.
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            enabled
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      {backupCodes && backupCodes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Backup codes — save these now</p>
          <p className="mt-1 text-xs text-amber-800">
            Each code works once if you lose access to your authenticator app.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-amber-950 sm:grid-cols-3">
            {backupCodes.map((code) => (
              <span key={code} className="rounded bg-white/80 px-2 py-1">
                {code}
              </span>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setBackupCodes(null)}
          >
            I saved these codes
          </Button>
        </div>
      )}

      {step === 'setup' && qrDataUrl && (
        <div className="space-y-4 rounded-xl border border-line bg-paper-100 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code for Google Authenticator"
            className="mx-auto h-44 w-44 rounded-lg"
          />
          <p className="text-center text-xs text-ink-muted">
            Open Google Authenticator → Add account → Scan QR code. Then enter the 6-digit code
            below.
          </p>
          <Input
            inputMode="numeric"
            label="Verification code"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center tracking-widest"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={loading || totpCode.length !== 6}
              onClick={() => void enable2fa()}
            >
              {loading ? 'Verifying…' : 'Verify & enable'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void cancelSetup()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <Input
            type="password"
            label="Account password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <Input
            inputMode="numeric"
            label="Google Authenticator code"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void disable2fa()}
            >
              {loading ? 'Disabling…' : 'Disable 2FA'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('idle')}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'idle' && !enabled && (
        <Button type="button" disabled={loading} onClick={() => void startSetup()}>
          {loading ? 'Preparing…' : 'Enable 2FA'}
        </Button>
      )}

      {step === 'idle' && enabled && (
        <Button type="button" variant="outline" onClick={() => setStep('disable')}>
          Disable 2FA
        </Button>
      )}
    </div>
  );
}
