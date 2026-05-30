'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from '@phosphor-icons/react/dist/ssr';
import { toast } from 'sonner';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success('Copied to clipboard');
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error('Could not copy');
        }
      }}
      className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-primary-600"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="ok"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Check weight="bold" size={12} />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Copy weight="bold" size={12} />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
