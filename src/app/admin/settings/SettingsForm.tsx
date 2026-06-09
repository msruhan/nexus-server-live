'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Initial = {
  siteName: string;
  siteTagline: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  supportEmail: string;
  adminNotificationEmail: string;
  brandShowPoweredBy: boolean;
  brandInvoicePrefix: string;
  copyrightText: string;
  enableRegistration: boolean;
  enableDirectPayment: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enforceAdmin2FA: boolean;
  metaTitle: string;
  metaDescription: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialTelegram: string;
  footerText: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState(initial);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingFavicon, setUploadingFavicon] = React.useState(false);

  function patch<K extends keyof Initial>(k: K, v: Initial[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function uploadBrandAsset(kind: 'logo' | 'favicon', file: File) {
    const setBusy = kind === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/admin/branding/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      patch(kind === 'logo' ? 'logoUrl' : 'faviconUrl', data.url);
      toast.success(`${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error('Save failed');
      return;
    }
    toast.success('Settings saved');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-12">
      <Card title="Brand & identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Site name"
            value={state.siteName}
            onChange={(e) => patch('siteName', e.target.value)}
          />
          <Input
            label="Tagline"
            value={state.siteTagline}
            onChange={(e) => patch('siteTagline', e.target.value)}
          />
          <Input
            label="Primary color"
            value={state.primaryColor}
            onChange={(e) => patch('primaryColor', e.target.value)}
            suffix={
              <span
                className="block h-5 w-5 rounded-full border border-line"
                style={{ background: state.primaryColor }}
              />
            }
          />
          <Input
            label="Support email"
            value={state.supportEmail}
            onChange={(e) => patch('supportEmail', e.target.value)}
            placeholder="support@yourbrand.com"
          />
          <div className="sm:col-span-2">
            <Input
              label="Admin notification email"
              value={state.adminNotificationEmail}
              onChange={(e) => patch('adminNotificationEmail', e.target.value)}
              placeholder="alerts@yourbrand.com"
            />
            <p className="mt-1 font-serif text-xs italic text-ink-muted">
              Receives alerts for new orders, top-ups, and tickets. Leave empty to use Support email.
            </p>
          </div>
        </div>
      </Card>

      <Card title="White-label">
        <p className="-mt-1 mb-5 font-serif text-sm italic text-ink-muted">
          Make the platform fully your own. Upload a logo and favicon, set your invoice prefix, and
          optionally hide the &ldquo;Powered by&rdquo; credit.
        </p>
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper">
              {state.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.logoUrl} alt="Logo" className="max-h-14 max-w-14 object-contain" />
              ) : (
                <span className="font-mono text-[9px] uppercase text-ink-soft">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">Logo</div>
              <div className="font-serif text-xs italic text-ink-muted">
                PNG / SVG, transparent background recommended.
              </div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">
                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadBrandAsset('logo', f);
                  }}
                />
              </label>
              {state.logoUrl && (
                <button
                  type="button"
                  onClick={() => patch('logoUrl', '')}
                  className="ml-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper">
              {state.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.faviconUrl} alt="Favicon" className="max-h-10 max-w-10 object-contain" />
              ) : (
                <span className="font-mono text-[9px] uppercase text-ink-soft">No icon</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-ink">Favicon</div>
              <div className="font-serif text-xs italic text-ink-muted">
                Square PNG, 64×64 or larger.
              </div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink">
                {uploadingFavicon ? 'Uploading…' : 'Upload favicon'}
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml"
                  className="hidden"
                  disabled={uploadingFavicon}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadBrandAsset('favicon', f);
                  }}
                />
              </label>
              {state.faviconUrl && (
                <button
                  type="button"
                  onClick={() => patch('faviconUrl', '')}
                  className="ml-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Invoice number prefix"
              value={state.brandInvoicePrefix}
              onChange={(e) => patch('brandInvoicePrefix', e.target.value.toUpperCase())}
              placeholder="INV"
            />
            <Input
              label="Copyright line (footer)"
              value={state.copyrightText}
              onChange={(e) => patch('copyrightText', e.target.value)}
              placeholder="© 2026 Your Brand"
            />
          </div>

          <Toggle
            label='Show "Powered by Recovero"'
            description="Turn off to fully white-label the footer credit."
            checked={state.brandShowPoweredBy}
            onChange={(v) => patch('brandShowPoweredBy', v)}
          />
        </div>
      </Card>

      <Card title="Feature flags">
        <div className="space-y-3">
          <Toggle
            label="Enable user registration"
            checked={state.enableRegistration}
            onChange={(v) => patch('enableRegistration', v)}
          />
          <Toggle
            label="Enable direct payment (gateway)"
            checked={state.enableDirectPayment}
            onChange={(v) => patch('enableDirectPayment', v)}
          />
          <Toggle
            label="Maintenance mode"
            description="Public pages will show the maintenance message. Admin remains accessible."
            checked={state.maintenanceMode}
            onChange={(v) => patch('maintenanceMode', v)}
          />
          {state.maintenanceMode && (
            <Textarea
              label="Maintenance message"
              value={state.maintenanceMessage}
              onChange={(e) => patch('maintenanceMessage', e.target.value)}
              rows={3}
            />
          )}
        </div>
      </Card>

      <Card title="Security">
        <Toggle
          label="Force 2FA for admin accounts"
          description="When ON, admin users without 2FA are redirected to a setup page until they enable it. Existing sessions stay valid; new admin route hits enforce."
          checked={state.enforceAdmin2FA}
          onChange={(v) => patch('enforceAdmin2FA', v)}
        />
      </Card>

      <Card title="SEO">
        <div className="space-y-5">
          <Input
            label="Meta title"
            value={state.metaTitle}
            onChange={(e) => patch('metaTitle', e.target.value)}
          />
          <Textarea
            label="Meta description"
            value={state.metaDescription}
            onChange={(e) => patch('metaDescription', e.target.value)}
            rows={3}
          />
        </div>
      </Card>

      <Card title="Social links">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Instagram"
            value={state.socialInstagram}
            onChange={(e) => patch('socialInstagram', e.target.value)}
          />
          <Input
            label="WhatsApp"
            value={state.socialWhatsapp}
            onChange={(e) => patch('socialWhatsapp', e.target.value)}
          />
          <Input
            label="Telegram"
            value={state.socialTelegram}
            onChange={(e) => patch('socialTelegram', e.target.value)}
          />
        </div>
      </Card>

      <Card title="Footer">
        <Textarea
          label="Footer text"
          value={state.footerText}
          onChange={(e) => patch('footerText', e.target.value)}
          rows={2}
        />
      </Card>

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <span className="font-serif text-sm italic text-ink-muted">
          Changes apply immediately on save.
        </span>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper-50 p-6">
      <h2 className="border-b border-line pb-3 font-display text-base font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-paper p-4">
      <div>
        <div className="font-medium text-ink">{label}</div>
        {description && <div className="mt-1 font-serif text-xs italic text-ink-muted">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
