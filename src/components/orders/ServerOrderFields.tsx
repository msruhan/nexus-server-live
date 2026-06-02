'use client';

import { Input, Textarea } from '@/components/ui/Input';
import {
  inputTypeForField,
  labelForFieldKey,
  type ServerFieldDef,
} from '@/lib/server-fields';

/**
 * Renders the dynamic server-order inputs based on a service's parsed
 * field definitions. Controlled via `values` / `onChange`. Shared by the
 * dedicated order page and the marketplace order modal.
 */
export function ServerOrderFields({
  fieldDefs,
  values,
  onChange,
}: {
  fieldDefs: ServerFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fieldDefs.map((field) => (
        <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
          {field.type === 'textarea' ? (
            <Textarea
              name={field.key}
              label={field.label || labelForFieldKey(field.key)}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              required={field.required}
            />
          ) : (
            <Input
              name={field.key}
              type={inputTypeForField(field)}
              label={field.label || labelForFieldKey(field.key)}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      ))}
    </div>
  );
}
