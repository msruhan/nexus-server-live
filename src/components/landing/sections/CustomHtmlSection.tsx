import { sanitizeHtml } from '@/lib/sanitize-html';

export function CustomHtmlSection({ html }: { html: string }) {
  // Sanitize server-side before rendering. Never trust editor-provided HTML.
  const safe = sanitizeHtml(html ?? '');
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10 lg:py-16">
      <div
        className="prose prose-ink max-w-none"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </section>
  );
}
