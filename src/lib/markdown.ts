// Minimal Markdown → HTML renderer (no external deps).
// Supports: headings, bold, italic, links, images, code, lists, blockquotes,
// horizontal rule, paragraphs.
// HTML in source is escaped first to prevent XSS.

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(line: string): string {
  let s = escapeHtml(line);
  // Inline code first so other patterns don't bleed in
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-paper-100 px-1 font-mono text-[90%]">$1</code>');
  // Image: ![alt](src)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="my-4 rounded-lg" />',
  );
  // Link: [text](href)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary-700 underline underline-offset-2 hover:text-primary-900">$1</a>',
  );
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic (single asterisk or underscore — but avoid eating ** from bold)
  s = s.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  s = s.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');
  return s;
}

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let para: string[] = [];

  function flushPara() {
    if (para.length === 0) return;
    out.push(`<p class="my-4 leading-relaxed">${para.map(inline).join(' ')}</p>`);
    para = [];
  }

  function closeList() {
    if (inList && listType) {
      out.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Empty line — flush paragraph and close lists
    if (line.trim() === '') {
      flushPara();
      closeList();
      closeBlockquote();
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      flushPara();
      closeList();
      closeBlockquote();
      out.push('<hr class="my-6 border-line" />');
      continue;
    }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      const sizes = ['', '4xl', '3xl', '2xl', 'xl', 'lg', 'base'];
      out.push(
        `<h${level} class="mt-8 mb-3 font-display text-${sizes[level]} font-extrabold tracking-tight text-ink">${inline(
          heading[2],
        )}</h${level}>`,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushPara();
      closeList();
      if (!inBlockquote) {
        out.push(
          '<blockquote class="my-4 border-l-4 border-primary-500 bg-paper-100 pl-4 py-2 font-serif italic text-ink-muted">',
        );
        inBlockquote = true;
      }
      out.push(`<p class="my-2">${inline(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    } else {
      closeBlockquote();
    }

    // Unordered list
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (!inList || listType !== 'ul') {
        closeList();
        out.push('<ul class="my-4 list-disc space-y-1 pl-6">');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      if (!inList || listType !== 'ol') {
        closeList();
        out.push('<ol class="my-4 list-decimal space-y-1 pl-6">');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${inline(ol[2])}</li>`);
      continue;
    } else {
      closeList();
    }

    // Default: append to paragraph buffer
    para.push(line);
  }

  flushPara();
  closeList();
  closeBlockquote();

  return out.join('\n');
}
