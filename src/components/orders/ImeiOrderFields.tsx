'use client';

import { Input, Textarea } from '@/components/ui/Input';
import type { BulkDeviceField } from '@/lib/imei-bulk-order';
import { bulkDeviceFieldLabel, MAX_BULK_ORDER_LINES } from '@/lib/imei-bulk-order';

export type ImeiRequires = {
  imei: boolean;
  network: boolean;
  model: boolean;
  provider: boolean;
  pin: boolean;
  kbh: boolean;
  mep: boolean;
  prd: boolean;
  sn: boolean;
  ecid: boolean;
  email: boolean;
  note: boolean;
};

/**
 * Renders the dynamic IMEI order inputs based on a service's `requires*`
 * flags. Uncontrolled — read values via FormData on the wrapping <form>.
 * Shared by the dedicated order page and the marketplace order modal.
 */
export function ImeiOrderFields({
  requires,
  bulkDeviceField,
}: {
  requires: ImeiRequires;
  bulkDeviceField?: BulkDeviceField | null;
}) {
  const bulkLabel = bulkDeviceField ? bulkDeviceFieldLabel(bulkDeviceField) : null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {requires.imei && (
          <div className="sm:col-span-2">
            <Input
              name="imei"
              label="IMEI"
              placeholder="15 digits"
              hint={
                bulkLabel
                  ? 'Single order only — or leave empty and use bulk order below.'
                  : 'Device IMEI — find it in Settings or dial *#06#'
              }
              pattern="[0-9]{14,16}"
              maxLength={16}
              required={!bulkLabel}
            />
          </div>
        )}
        {requires.network && (
          <Input name="network" label="Network / Carrier" placeholder="T-Mobile USA" required />
        )}
        {requires.model && <Input name="model" label="Model" placeholder="SM-S928B" required />}
        {requires.provider && <Input name="provider" label="Provider" required />}
        {requires.pin && <Input name="pin" label="PIN" required />}
        {requires.kbh && <Input name="kbh" label="KBH code" required />}
        {requires.mep && <Input name="mep" label="MEP code" required />}
        {requires.prd && <Input name="prd" label="PRD code" required />}
        {requires.sn && (
          <Input
            name="serialNumber"
            label="Serial Number"
            hint={bulkLabel ? 'Single order only — or leave empty and use bulk order below.' : undefined}
            required={!bulkLabel}
          />
        )}
        {requires.ecid && (
          <div className="sm:col-span-2">
            <Input
              name="ecid"
              label="ECID"
              placeholder="Device ECID"
              hint={bulkLabel ? 'Single order only — or leave empty and use bulk order below.' : undefined}
              required={!bulkLabel}
            />
          </div>
        )}
        {requires.email && <Input name="email" type="email" label="Email" required />}
      </div>
      {bulkLabel && (
        <Textarea
          name="bulkOrder"
          label="Bulk order"
          placeholder={`${bulkLabel} line 1\n${bulkLabel} line 2`}
          hint={`Optional. Enter one ${bulkLabel} per line (max ${MAX_BULK_ORDER_LINES}). Each line creates a separate order, submitted sequentially upstream.`}
          rows={4}
        />
      )}
      {requires.note && (
        <Textarea name="note" label="Note" placeholder="Additional information (optional)" rows={3} />
      )}
    </>
  );
}
