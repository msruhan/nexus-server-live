import * as React from 'react';

const ITALIC_RE = /\{italic:([^}]+)\}/g;

/** Renders text with `{italic:word}` markup turned into serif italic spans. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ITALIC_RE.lastIndex = 0;
  while ((match = ITALIC_RE.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-serif italic font-normal">
        {match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <span className={className}>{parts}</span>;
}
