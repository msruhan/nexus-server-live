import { cn } from '@/lib/cn';

type Props = {
  section: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ section, title, subtitle, actions, className }: Props) {
  return (
    <header className={cn('border-b border-line pb-8 mb-8', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            {section}
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-2xl font-serif text-base italic leading-relaxed text-ink-muted lg:text-lg">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
