'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'group flex items-center gap-2 rounded-lg border bg-paper-50 px-3 transition-all',
            error
              ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200'
              : 'border-line focus-within:border-ink focus-within:bg-paper',
          )}
        >
          {prefix && <span className="text-ink-muted">{prefix}</span>}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft',
              className,
            )}
            {...props}
          />
          {suffix && <span className="text-ink-muted">{suffix}</span>}
        </div>
        {hint && !error && <p className="font-serif text-xs italic text-ink-muted">{hint}</p>}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-lg border bg-paper-50 px-3 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-soft focus:bg-paper',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-line focus:border-ink',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="font-serif text-xs italic text-ink-muted">{hint}</p>}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
