import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseFooterContent } from '@/lib/footer-content';
import { FooterEditor } from './FooterEditor';

export const dynamic = 'force-dynamic';

export default async function FooterCmsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  const content = parseFooterContent(settings?.footerContent);

  return (
    <div>
      <PageHeader
        section="§ Admin · CMS"
        title={
          <>
            Footer <span className="font-serif italic font-normal">content</span>.
          </>
        }
        subtitle="Wordmark intro, newsletter block, link columns, social icons, and copyright."
      />
      <FooterEditor
        initialContent={content}
        initialSettings={{
          siteName: settings?.siteName ?? 'Recovero',
          siteTagline: settings?.siteTagline ?? '',
          footerText: settings?.footerText ?? '',
          copyrightText: settings?.copyrightText ?? '',
          brandShowPoweredBy: settings?.brandShowPoweredBy ?? true,
          socialInstagram: settings?.socialInstagram ?? '',
          socialTiktok: settings?.socialTiktok ?? '',
          socialWhatsapp: settings?.socialWhatsapp ?? '',
          socialTelegram: settings?.socialTelegram ?? '',
          socialFacebook: settings?.socialFacebook ?? '',
          socialYoutube: settings?.socialYoutube ?? '',
        }}
      />
    </div>
  );
}
