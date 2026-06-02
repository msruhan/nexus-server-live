'use client';

import { Input, Textarea } from '@/components/ui/Input';

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
  email: boolean;
  note: boolean;
};

/**
 * Renders the dynamic IMEI order inputs based on a service's `requires*`
 * flags. Uncontrolled — read values via FormData on the wrapping <form>.
 * Shared by the dedicated order page and the marketplace order modal.
 */
export function ImeiOrderFields({ requires }: { requires: ImeiRequires }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {requires.imei && (
          <div className="sm:col-span-2">
            <Input
              name="imei"
              label="IMEI"
              placeholder="15 digits"
              hint="Device IMEI — find it in Settings or dial *#06#"
              pattern="[0-9]{14,16}"
              maxLength={16}
              required
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
        {requires.sn && <Input name="serialNumber" label="Serial Number" required />}
        {requires.email && <Input name="email" type="email" label="Email" required />}
      </div>
      {requires.note && (
        <Textarea name="note" label="Note" placeholder="Additional information (optional)" rows={3} />
      )}
    </>
  );
}
