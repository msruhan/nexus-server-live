'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  inputTypeForField,
  labelForFieldKey,
  type ServerFieldDef,
  validateServerOrderFields,
} from '@/lib/server-fields';

export function ServerOrderForm({
  serviceId,
  fieldDefs,
}: {
  serviceId: string;
  fieldDefs: ServerFieldDef[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(fieldDefs.map((f) => [f.key, ''])),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validateServerOrderFields(fieldDefs, values);
    if (!validation.ok) {
      toast.error('Invalid input', { description: validation.error });
      return;
    }

    setLoading(true);
    const res = await fetch('/api/imei/server-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        requiredFields: validation.fields,
      }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      toast.error('Order failed', { description: j.error ?? 'Please try again.' });
      return;
    }
    toast.success('Docket submitted', { description: j.data?.orderCode });
    router.push(`/user/orders/${j.data?.id}?type=server`);
    router.refresh();
  }

  if (fieldDefs.length === 0) {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-serif italic text-amber-900">
        This service has no order fields configured. Contact admin.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-paper-50 p-6 lg:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {fieldDefs.map((field) => (
          <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {field.type === 'textarea' ? (
              <Textarea
                name={field.key}
                label={field.label || labelForFieldKey(field.key)}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                required={field.required}
              />
            ) : (
              <Input
                name={field.key}
                type={inputTypeForField(field)}
                label={field.label || labelForFieldKey(field.key)}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Submitting…' : 'Submit docket'}
        <ArrowUpRight weight="bold" className="ml-1" />
      </Button>
    </form>
  );
}
