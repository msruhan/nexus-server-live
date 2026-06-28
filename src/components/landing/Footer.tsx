import Link from 'next/link';
import { prisma } from '@/lib/db';
import {
  ArrowUpRight,
  InstagramLogo,
  TiktokLogo,
  WhatsappLogo,
  TelegramLogo,
  FacebookLogo,
  YoutubeLogo,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { parseFooterContent, resolveFooterForRender } from '@/lib/footer-content';
import { resolveSiteName, POWERED_BY_RECOVERO } from '@/lib/site-name';

export async function Footer() {
  const [menus, settings] = await Promise.all([
    prisma.navigationMenu.findMany({
      where: { location: 'footer', isVisible: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  const siteName = resolveSiteName(settings?.siteName);
  const footerContent = parseFooterContent(settings?.footerContent);
  const resolved = resolveFooterForRender(footerContent, {
    siteName,
    siteTagline: settings?.siteTagline ?? 'Unlock Service Portal',
    footerText: settings?.footerText ?? null,
    copyrightText: settings?.copyrightText ?? null,
    brandShowPoweredBy: settings?.brandShowPoweredBy ?? true,
    socialInstagram: settings?.socialInstagram ?? null,
    socialTiktok: settings?.socialTiktok ?? null,
    socialWhatsapp: settings?.socialWhatsapp ?? null,
    socialTelegram: settings?.socialTelegram ?? null,
    socialFacebook: settings?.socialFacebook ?? null,
    socialYoutube: settings?.socialYoutube ?? null,
  });

  const socials: Array<{ icon: Icon; href: string; label: string }> = [];
  if (resolved.socials.instagram) {
    socials.push({ icon: InstagramLogo, href: resolved.socials.instagram, label: 'Instagram' });
  }
  if (resolved.socials.tiktok) {
    socials.push({ icon: TiktokLogo, href: resolved.socials.tiktok, label: 'TikTok' });
  }
  if (resolved.socials.whatsapp) {
    socials.push({ icon: WhatsappLogo, href: resolved.socials.whatsapp, label: 'WhatsApp' });
  }
  if (resolved.socials.telegram) {
    socials.push({ icon: TelegramLogo, href: resolved.socials.telegram, label: 'Telegram' });
  }
  if (resolved.socials.facebook) {
    socials.push({ icon: FacebookLogo, href: resolved.socials.facebook, label: 'Facebook' });
  }
  if (resolved.socials.youtube) {
    socials.push({ icon: YoutubeLogo, href: resolved.socials.youtube, label: 'YouTube' });
  }

  const useMenuLinks = resolved.linkMode === 'menus' && menus.length > 0;
  const columns = resolved.columns;

  return (
    <footer className="relative border-t border-line bg-paper">
      <div className="mx-auto max-w-[1400px] border-b border-line px-6 py-12 lg:px-10 lg:py-20">
        <h2 className="font-display text-[clamp(3rem,12vw,12rem)] font-black leading-none tracking-tightest text-ink">
          {siteName}<span className="text-primary-500">.</span>
        </h2>
        <p className="mt-4 max-w-2xl font-serif text-lg italic text-ink-muted lg:text-xl">
          {resolved.introText}
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-14 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            {resolved.newsletter.enabled && (
              <>
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700/70">
                  {resolved.newsletterEyebrow}
                </span>
                <p className="mt-3 max-w-sm font-display text-lg font-bold tracking-tight text-ink">
                  {resolved.newsletter.heading}
                </p>
                <form
                  action="/api/newsletter"
                  method="post"
                  className="mt-5 flex w-full max-w-sm items-center border-b border-ink py-2 transition-colors focus-within:border-primary-500"
                >
                  <input
                    type="email"
                    name="email"
                    placeholder={resolved.newsletter.emailPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  />
                  <button className="group flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-primary-700">
                    {resolved.newsletter.buttonLabel}
                    <ArrowUpRight
                      weight="bold"
                      size={12}
                      className="transition-transform group-hover:rotate-45"
                    />
                  </button>
                </form>
              </>
            )}

            {socials.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${resolved.newsletter.enabled ? 'mt-7' : ''}`}>
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-50 text-ink hover:border-ink"
                  >
                    <s.icon size={14} weight="fill" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-8">
            {useMenuLinks ? (
              <div className="col-span-full">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                  {menus.map((m) => (
                    <Link
                      key={m.id}
                      href={m.href}
                      target={m.isExternal ? '_blank' : undefined}
                      rel={m.isExternal ? 'noreferrer' : undefined}
                      className="group inline-flex items-center gap-1 text-sm text-ink/70 transition-colors hover:text-ink"
                    >
                      <span>{m.label}</span>
                      <ArrowUpRight
                        weight="bold"
                        size={10}
                        className="opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              columns.map((sec, i) => (
                <div key={`${sec.title}-${i}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-ink-soft">
                      0{i + 1}
                    </span>
                    <h4 className="font-display text-sm font-extrabold tracking-tight text-ink">
                      {sec.title}
                    </h4>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {sec.links.map((l) => (
                      <li key={`${l.label}-${l.href}`}>
                        <Link
                          href={l.href}
                          className="text-sm text-ink/70 transition-colors hover:text-ink"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>{resolved.copyright}</span>
          {resolved.brandShowPoweredBy && (
            <span className="text-ink-soft">{POWERED_BY_RECOVERO}</span>
          )}
        </div>
      </div>
    </footer>
  );
}
