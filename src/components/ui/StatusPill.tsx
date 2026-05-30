import { cn } from '@/lib/cn';

type StatusPillProps = {
  status: string;
  className?: string;
};

const palette: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  SUBMITTED: 'bg-primary-50 text-primary-700 ring-primary-200',
  IN_PROCESS: 'bg-primary-100 text-primary-800 ring-primary-300',
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  REFUNDED: 'bg-slate-100 text-slate-700 ring-slate-200',

  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-200',

  TOPUP: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PAYMENT: 'bg-primary-50 text-primary-700 ring-primary-200',
  REFUND: 'bg-amber-50 text-amber-700 ring-amber-200',

  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ADMIN: 'bg-ink text-paper ring-ink',
  USER: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function StatusPill({ status, className }: StatusPillProps) {
  const tone = palette[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ring-1 ring-inset',
        tone,
        className,
      )}
    >
      {status === 'IN_PROCESS' && (
        <span className="relative h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-block h-full w-full rounded-full bg-current" />
        </span>
      )}
      {status.replace('_', ' ')}
    </span>
  );
}
