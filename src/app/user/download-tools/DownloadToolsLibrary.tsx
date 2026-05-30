'use client';

import * as React from 'react';
import { DownloadSimple, ArrowSquareOut } from '@phosphor-icons/react';

type Tool = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string | null;
  platform: string | null;
  downloadUrl: string;
};

export function DownloadToolsLibrary({ tools }: { tools: Tool[] }) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('all');

  const categories = Array.from(new Set(tools.map((t) => t.category))).sort();

  const filtered = React.useMemo(() => {
    let list = category === 'all' ? tools : tools.filter((t) => t.category === category);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [t.title, t.description, t.category, t.platform, t.version]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [tools, search, category]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <input
          type="search"
          placeholder="Search by name, category, platform…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line bg-paper-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              category === 'all' ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === c ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-paper-50 px-6 py-16 text-center">
          <p className="font-serif italic text-ink-muted">
            {tools.length === 0
              ? 'No tools published yet. Check back later.'
              : 'No tools match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="flex flex-col rounded-xl border border-line bg-paper-50 p-5 transition hover:border-ink/30 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-ink/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                  {t.category}
                </span>
                {t.platform && (
                  <span className="font-mono text-[10px] text-ink-muted">{t.platform}</span>
                )}
                {t.version && (
                  <span className="font-mono text-[10px] text-ink-muted">v{t.version}</span>
                )}
              </div>
              <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-ink">{t.title}</h3>
              {t.description && <p className="mt-1 flex-1 text-sm text-ink-muted">{t.description}</p>}
              <a
                href={t.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-primary-600"
              >
                <DownloadSimple size={18} weight="bold" />
                Download
                <ArrowSquareOut size={14} className="opacity-70" />
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
