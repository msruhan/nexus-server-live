'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FloppyDisk } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { FooterColumn, FooterContent } from '@/lib/footer-content';

type SettingsSlice = {
  siteName: string;
  siteTagline: string;
  footerText: string;
  copyrightText: string;
  brandShowPoweredBy: boolean;
  socialInstagram: string;
  socialTiktok: string;
  socialWhatsapp: string;
  socialTelegram: string;
  socialFacebook: string;
  socialYoutube: string;
};

type Props = {
  initialContent: FooterContent;
  initialSettings: SettingsSlice;
};

function ColumnEditor({
  columns,
  onChange,
}: {
  columns: FooterColumn[];
  onChange: (next: FooterColumn[]) => void;
}) {
  function patchColumn(idx: number, patch: Partial<FooterColumn>) {
    onChange(columns.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function patchLink(colIdx: number, linkIdx: number, patch: Partial<{ label: string; href: string }>) {
    onChange(
      columns.map((c, i) =>
        i !== colIdx
          ? c
          : {
              ...c,
              links: c.links.map((l, j) => (j === linkIdx ? { ...l, ...patch } : l)),
            },
      ),
    );
  }

  function moveColumn(idx: number, dir: -1 | 1) {
    const next = [...columns];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Link columns ({columns.length})
        </span>
        <button
          type="button"
          onClick={() => onChange([...columns, { title: 'New column', links: [{ label: 'Link', href: '/' }] }])}
          className="rounded-full bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-paper hover:bg-primary-600"
        >
          + Add column
        </button>
      </div>
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="rounded-xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
              Column {colIdx + 1}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveColumn(colIdx, -1)} className="text-ink-muted hover:text-ink">↑</button>
              <button type="button" onClick={() => moveColumn(colIdx, 1)} className="text-ink-muted hover:text-ink">↓</button>
              <button
                type="button"
                onClick={() => onChange(columns.filter((_, i) => i !== colIdx))}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
          <Input
            label="Column title"
            value={col.title}
            onChange={(e) => patchColumn(colIdx, { title: e.target.value })}
          />
          <div className="mt-3 space-y-2">
            {col.links.map((link, linkIdx) => (
              <div key={linkIdx} className="grid gap-2 rounded-lg border border-line bg-paper-50 p-3 sm:grid-cols-2">
                <Input
                  label="Label"
                  value={link.label}
                  onChange={(e) => patchLink(colIdx, linkIdx, { label: e.target.value })}
                />
                <Input
                  label="URL"
                  value={link.href}
                  onChange={(e) => patchLink(colIdx, linkIdx, { href: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() =>
                    patchColumn(colIdx, {
                      links: col.links.filter((_, i) => i !== linkIdx),
                    })
                  }
                  className="text-left text-xs text-red-500 hover:text-red-700 sm:col-span-2"
                >
                  Remove link
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patchColumn(colIdx, {
                  links: [...col.links, { label: '', href: '/' }],
                })
              }
              className="text-xs font-semibold text-ink-muted hover:text-ink"
            >
              + Add link
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FooterEditor({ initialContent, initialSettings }: Props) {
  const [content, setContent] = React.useState<FooterContent>(initialContent);
  const [settings, setSettings] = React.useState(initialSettings);
  const [saving, setSaving] = React.useState(false);

  const introText = content.introText ?? settings.footerText;

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/cms/footer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        introText,
        footerText: introText,
        siteTagline: settings.siteTagline,
        copyrightText: settings.copyrightText || null,
        brandShowPoweredBy: settings.brandShowPoweredBy,
        socialInstagram: settings.socialInstagram || null,
        socialTiktok: settings.socialTiktok || null,
        socialWhatsapp: settings.socialWhatsapp || null,
        socialTelegram: settings.socialTelegram || null,
        socialFacebook: settings.socialFacebook || null,
        socialYoutube: settings.socialYoutube || null,
        newsletter: content.newsletter,
        linkMode: content.linkMode,
        columns: content.columns,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Save failed');
      return;
    }
    toast.success('Footer saved');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Brand wordmark</h2>
        <p className="mt-1 font-serif text-sm italic text-ink-muted">
          Large logo uses site name from <strong>Settings → Branding</strong> ({settings.siteName}).
        </p>
        <div className="mt-4">
          <Textarea
            label="Intro paragraph"
            hint="Shown under the large wordmark."
            value={introText}
            onChange={(e) => {
              const v = e.target.value;
              setContent((c) => ({ ...c, introText: v }));
              setSettings((s) => ({ ...s, footerText: v }));
            }}
            rows={3}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Newsletter block</h2>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={content.newsletter.enabled}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  newsletter: { ...c.newsletter, enabled: e.target.checked },
                }))
              }
              className="rounded border-line"
            />
            Enabled
          </label>
        </div>
        {content.newsletter.enabled && (
          <div className="mt-4 space-y-4">
            <Input
              label="Eyebrow"
              hint="Small caps line above the heading. Falls back to site tagline if empty."
              value={content.newsletter.eyebrow}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  newsletter: { ...c.newsletter, eyebrow: e.target.value },
                }))
              }
            />
            <Input
              label="Site tagline (fallback eyebrow)"
              value={settings.siteTagline}
              onChange={(e) => setSettings((s) => ({ ...s, siteTagline: e.target.value }))}
            />
            <Textarea
              label="Heading"
              value={content.newsletter.heading}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  newsletter: { ...c.newsletter, heading: e.target.value },
                }))
              }
              rows={2}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email placeholder"
                value={content.newsletter.emailPlaceholder}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    newsletter: { ...c.newsletter, emailPlaceholder: e.target.value },
                  }))
                }
              />
              <Input
                label="Button label"
                value={content.newsletter.buttonLabel}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    newsletter: { ...c.newsletter, buttonLabel: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Footer links</h2>
        <p className="mt-1 font-serif text-sm italic text-ink-muted">
          Use structured columns or pull a flat list from <strong>CMS → Menus → Footer</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-line bg-paper p-1">
          {(['columns', 'menus'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setContent((c) => ({ ...c, linkMode: mode }))}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                content.linkMode === mode ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper-100'
              }`}
            >
              {mode === 'columns' ? 'Structured columns' : 'Navigation menus'}
            </button>
          ))}
        </div>
        {content.linkMode === 'columns' ? (
          <div className="mt-4">
            <ColumnEditor
              columns={content.columns}
              onChange={(columns) => setContent((c) => ({ ...c, columns }))}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-paper px-4 py-3 text-sm text-ink-muted">
            Visible links come from menu items with location <code className="font-mono text-xs">footer</code>.
            Edit them under CMS → Navigation menus.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Social links</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Instagram" value={settings.socialInstagram} onChange={(e) => setSettings((s) => ({ ...s, socialInstagram: e.target.value }))} />
          <Input label="TikTok" value={settings.socialTiktok} onChange={(e) => setSettings((s) => ({ ...s, socialTiktok: e.target.value }))} />
          <Input label="WhatsApp" value={settings.socialWhatsapp} onChange={(e) => setSettings((s) => ({ ...s, socialWhatsapp: e.target.value }))} />
          <Input label="Telegram" value={settings.socialTelegram} onChange={(e) => setSettings((s) => ({ ...s, socialTelegram: e.target.value }))} />
          <Input label="Facebook" value={settings.socialFacebook} onChange={(e) => setSettings((s) => ({ ...s, socialFacebook: e.target.value }))} />
          <Input label="YouTube" value={settings.socialYoutube} onChange={(e) => setSettings((s) => ({ ...s, socialYoutube: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper-50 p-6">
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Bottom bar</h2>
        <div className="mt-4 space-y-4">
          <Input
            label="Copyright line"
            value={settings.copyrightText}
            onChange={(e) => setSettings((s) => ({ ...s, copyrightText: e.target.value }))}
            placeholder={`© ${new Date().getFullYear()} ${settings.siteName}`}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={settings.brandShowPoweredBy}
              onChange={(e) => setSettings((s) => ({ ...s, brandShowPoweredBy: e.target.checked }))}
              className="rounded border-line"
            />
            Show &ldquo;Powered by Recovero&rdquo;
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end rounded-2xl border border-line bg-paper p-4 shadow-card-hover">
        <Button onClick={save} disabled={saving}>
          <FloppyDisk weight="bold" size={16} />
          {saving ? 'Saving…' : 'Save footer'}
        </Button>
      </div>
    </div>
  );
}
