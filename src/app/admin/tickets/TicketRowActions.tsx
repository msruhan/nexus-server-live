'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export function TicketRowActions({
  ticketId,
  ticketCode,
}: {
  ticketId: string;
  ticketCode: string;
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const ok = await confirmDialog({
      title: 'Delete ticket',
      description: `Delete ticket ${ticketCode}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error('Delete failed', { description: json.error ?? 'Unknown error' });
        return;
      }
      toast.success('Ticket deleted');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/tickets/${ticketId}`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper-200 hover:text-ink"
        title="View ticket"
        aria-label={`View ticket ${ticketCode}`}
      >
        <Eye size={16} weight="regular" />
      </Link>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        title="Delete ticket"
        aria-label={`Delete ticket ${ticketCode}`}
      >
        <Trash size={16} weight="regular" />
      </button>
    </div>
  );
}
