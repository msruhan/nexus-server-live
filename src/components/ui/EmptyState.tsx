import { cn } from '@/lib/cn';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-paper-50/40 px-6 py-16 text-center',
        className,
      )}
    >
      {/* Decorative SVG mark */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        className="text-ink-soft"
        aria-hidden
      >
        <rect x="6" y="6" width="44" height="44" rx="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="6" y1="50" x2="50" y2="6" stroke="currentColor" strokeWidth="1" />
      </svg>
      <h3 className="font-display text-lg font-bold tracking-tight text-ink">{title}</h3>
      <p className="max-w-sm font-serif italic text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
