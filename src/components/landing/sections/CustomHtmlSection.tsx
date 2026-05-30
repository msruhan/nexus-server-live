export function CustomHtmlSection({ html }: { html: string }) {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10 lg:py-16">
      <div
        className="prose prose-ink max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
