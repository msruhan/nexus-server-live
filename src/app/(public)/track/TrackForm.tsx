'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ORDER_CODE_PATTERN } from '@/lib/generate-order-code';

export function TrackForm({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = React.useState(initialCode);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Order code is required');
      return;
    }
    if (!ORDER_CODE_PATTERN.test(trimmed)) {
      setError('Code looks like ID-K7VN3P2WXR9M');
      return;
    }
    setError(null);
    const next = new URLSearchParams(params.toString());
    next.set('code', trimmed);
    startTransition(() => {
      router.push(`/track?${next.toString()}`);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-paper-50 p-6"
    >
      <div>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Lookup
        </h2>
        <p className="mt-1 font-serif text-sm italic text-ink-muted">
          Status updates within seconds of supplier reply.
        </p>
      </div>
      <Input
        label="Order code"
        placeholder="ID-K7VN3P2WXR9M"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="characters"
        error={error ?? undefined}
      />
      <Button type="submit" disabled={pending} className="self-start">
        <MagnifyingGlass size={14} weight="bold" />
        {pending ? 'Looking up…' : 'Track order'}
      </Button>
    </form>
  );
}
