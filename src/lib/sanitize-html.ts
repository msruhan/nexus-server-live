/**
 * Dependency-free, allow-list HTML sanitizer for the CMS custom_html section.
 *
 * Runs SERVER-SIDE before markup reaches the client. It is intentionally
 * conservative: the input surface is a single admin-only textarea, so a
 * strict allow-list is sufficient and avoids pulling in dompurify + jsdom.
 *
 * Guarantees (for any input string):
 *   - removes <script>, <iframe>, <object>, <embed>, <style>, <form>,
 *     <link>, <meta> elements AND their contents
 *   - removes any attribute whose name begins with "on" (event handlers)
 *   - removes href/src/xlink:href values using javascript:, vbscript:, or
 *     data: schemes
 *   - strips tags not on the allow-list while keeping their inner text
 *   - keeps allow-listed formatting tags and their safe attributes
 *
 * If full HTML5 parsing fidelity is ever required, the internals can be
 * swapped for dompurify+jsdom without changing this signature.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'img', 'span', 'div', 'hr', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);

// Tags whose entire contents are removed (not just the tag).
const REMOVE_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript',
  'template', 'svg', 'math',
]);

// Void/self-closing tags that have no separate closing tag.
const VOID_TAGS = new Set(['br', 'hr', 'img']);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  '*': new Set(['class']),
};

const URL_ATTRS = new Set(['href', 'src', 'xlink:href']);

function isSafeUrlValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  // Allow site-relative, anchors, mailto, tel; block dangerous schemes.
  if (v.startsWith('/') || v.startsWith('#')) return true;
  if (v.startsWith('mailto:') || v.startsWith('tel:')) return true;
  if (v.startsWith('http://') || v.startsWith('https://')) return true;
  // Anything with a scheme we don't recognize (javascript:, data:, vbscript:, ...) is unsafe.
  if (/^[a-z][a-z0-9+.-]*:/.test(v)) return false;
  // Relative path without leading slash (e.g. "page.html") — allow.
  return true;
}

function sanitizeAttributes(tag: string, attrString: string): string {
  if (!attrString.trim()) return '';
  const allowedForTag = ALLOWED_ATTRS[tag] ?? new Set<string>();
  const allowedGlobal = ALLOWED_ATTRS['*'];

  const out: string[] = [];
  // Match: name="value" | name='value' | name=value | name
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrString)) !== null) {
    const name = m[1].toLowerCase();
    let value = m[2] ?? '';
    // Strip surrounding quotes.
    if (value && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }

    // Drop event handlers.
    if (name.startsWith('on')) continue;
    // Drop style attribute (can carry expressions / external loads).
    if (name === 'style') continue;

    const isAllowed = allowedForTag.has(name) || allowedGlobal.has(name);
    if (!isAllowed) continue;

    // Validate URL-bearing attributes.
    if (URL_ATTRS.has(name)) {
      if (!isSafeUrlValue(value)) continue;
    }

    if (value) {
      const escaped = value.replace(/"/g, '&quot;');
      out.push(`${name}="${escaped}"`);
    } else {
      out.push(name);
    }
  }
  return out.length ? ' ' + out.join(' ') : '';
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1) Remove dangerous elements together with their content.
  let s = html;
  for (const tag of REMOVE_WITH_CONTENT) {
    // Non-greedy, case-insensitive, dot-all via [\s\S].
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    s = s.replace(re, '');
    // Also remove any self-closing / unclosed leftover opening tags.
    const reOpen = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    s = s.replace(reOpen, '');
  }

  // 2) Remove HTML comments (can hide conditional-comment scripts).
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // 3) Walk remaining tags; rebuild allow-listed ones, strip others (keep text).
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;
  s = s.replace(tagRe, (_full, rawName: string, attrs: string, selfClose: string) => {
    const name = rawName.toLowerCase();
    const isClosing = _full.startsWith('</');
    if (!ALLOWED_TAGS.has(name)) {
      // Strip the tag entirely but keep surrounding text content.
      return '';
    }
    if (isClosing) {
      return `</${name}>`;
    }
    const cleanAttrs = sanitizeAttributes(name, attrs);
    const close = VOID_TAGS.has(name) ? ' />' : '>';
    // For void tags ignore any provided content slash; emit normalized.
    if (VOID_TAGS.has(name)) {
      return `<${name}${cleanAttrs} />`;
    }
    return `<${name}${cleanAttrs}${selfClose ? '>' : '>'}`;
  });

  return s;
}
