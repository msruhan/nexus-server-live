'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Copy, Eye, EyeSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';

/** Typical length: nx_live_ (8) + 48 hex chars */
export const API_KEY_DISPLAY_MASK_LENGTH = 56;

function maskBullets(length: number) {
  return '•'.repeat(Math.max(length, 24));
}

export function ApiKeySecretDisplay({
  value,
  copyValue,
  maskLength = API_KEY_DISPLAY_MASK_LENGTH,
  defaultVisible = false,
  prefixOnly = false,
  compact = false,
  monoClassName = 'block flex-1 overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs text-ink',
}: {
  /** Shown when visible (full secret or stored prefix only). */
  value: string;
  /** Text written to clipboard — defaults to `value`. */
  copyValue?: string;
  /** Bullet count when hidden (hides all characters). */
  maskLength?: number;
  defaultVisible?: boolean;
  /** Stored keys: only prefix exists; copy cannot retrieve full secret. */
  prefixOnly?: boolean;
  /** Hide helper line under prefix (for tight table cells). */
  compact?: boolean;
  monoClassName?: string;
}) {
  const [visible, setVisible] = React.useState(defaultVisible);
  const hiddenDisplay = maskBullets(maskLength);
  const clipboardText = copyValue ?? value;

  React.useEffect(() => {
    setVisible(defaultVisible);
  }, [value, defaultVisible]);

  async function copy() {
    if (!clipboardText.trim()) {
      toast.error('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(clipboardText);
      if (prefixOnly) {
        toast.success('Prefix copied', {
          description:
            'Only the first 15 characters are stored. The full API key was shown once when you created it.',
        });
      } else {
        toast.success('Full API key copied');
      }
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <code className={monoClassName}>{visible ? value : hiddenDisplay}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setVisible((v) => !v)}
          title={visible ? 'Hide' : 'Show'}
          aria-label={visible ? 'Hide secret' : 'Show secret'}
        >
          {visible ? <EyeSlash size={14} /> : <Eye size={14} />}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()} title="Copy" aria-label="Copy">
          <Copy size={14} />
        </Button>
      </div>
      {prefixOnly && visible && !compact && (
        <p className="font-mono text-[9px] text-ink-muted">
          Prefix only — full secret is not stored. Create a new key if you lost it.
        </p>
      )}
    </div>
  );
}
