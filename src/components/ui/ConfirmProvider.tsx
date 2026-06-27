'use client';

import * as React from 'react';
import { Info, Trash, Warning } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export type ConfirmTone = 'default' | 'danger' | 'warning';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmState = ConfirmOptions & { open: true };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

const toneStyles: Record<
  ConfirmTone,
  { panel: string; iconWrap: string; icon: string; confirmBtn: string }
> = {
  default: {
    panel: 'border-line',
    iconWrap: 'bg-paper-100 text-ink',
    icon: 'text-ink',
    confirmBtn: '',
  },
  danger: {
    panel: 'border-rose-200',
    iconWrap: 'bg-rose-50 text-rose-700',
    icon: 'text-rose-700',
    confirmBtn: '!bg-rose-700 hover:!bg-rose-800 text-paper',
  },
  warning: {
    panel: 'border-amber-300',
    iconWrap: 'bg-amber-100 text-amber-800',
    icon: 'text-amber-800',
    confirmBtn: '!bg-amber-800 hover:!bg-amber-900 text-paper',
  },
};

function ToneIcon({ tone }: { tone: ConfirmTone }) {
  const cls = 'shrink-0';
  if (tone === 'danger') return <Trash weight="bold" size={20} className={cls} />;
  if (tone === 'warning') return <Warning weight="fill" size={22} className={cls} />;
  return <Info weight="bold" size={20} className={cls} />;
}

function ConfirmDialog({
  state,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tone = state.tone ?? (state.confirmLabel?.toLowerCase().includes('delete') ? 'danger' : 'default');
  const styles = toneStyles[tone];
  const titleId = React.useId();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'w-full max-w-md rounded-2xl border bg-paper p-6 shadow-xl',
          styles.panel,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              styles.iconWrap,
            )}
          >
            <span className={styles.icon}>
              <ToneIcon tone={tone} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="font-display text-lg font-bold text-ink">
              {state.title}
            </h3>
            {state.description ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                {state.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {state.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            type="button"
            size="sm"
            className={styles.confirmBtn}
            onClick={onConfirm}
            autoFocus
          >
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const close = React.useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }, []);

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const value = React.useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <ConfirmDialog
          state={state}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}
