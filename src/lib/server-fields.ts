/**
 * Server service order field definitions — presets, parse, serialize, validate.
 */

export type ServerFieldType = 'text' | 'email' | 'number' | 'password' | 'textarea'

export interface ServerFieldDef {
  key: string
  label: string
  required: boolean
  type: ServerFieldType
}

/** Preset fields admin can enable per service (keys match Dhru/luteam conventions). */
export const SERVER_FIELD_PRESETS: readonly ServerFieldDef[] = [
  { key: 'qnt', label: 'Quantity (Qnt)', required: false, type: 'number' },
  { key: 'sn', label: 'Serial Number (SN)', required: false, type: 'text' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'username', label: 'Username', required: false, type: 'text' },
  { key: 'password', label: 'Password', required: false, type: 'password' },
  { key: 'id', label: 'ID', required: false, type: 'text' },
  { key: 'licensekey', label: 'License Key', required: false, type: 'text' },
  { key: 'comments', label: 'Catatan', required: false, type: 'textarea' },
] as const

const PRESET_BY_KEY = new Map(
  SERVER_FIELD_PRESETS.map((p) => [normalizeFieldKey(p.key), p]),
)

export function normalizeFieldKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '')
}

/** Human label for a field key (preset or formatted key). */
export function labelForFieldKey(key: string): string {
  const preset = PRESET_BY_KEY.get(normalizeFieldKey(key))
  if (preset) return preset.label
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function inputTypeForField(field: ServerFieldDef): string {
  switch (field.type) {
    case 'email':
      return 'email'
    case 'number':
      return 'number'
    case 'password':
      return 'password'
    default:
      return 'text'
  }
}

function inferTypeFromKey(key: string): ServerFieldType {
  const k = normalizeFieldKey(key)
  const preset = PRESET_BY_KEY.get(k)
  if (preset) return preset.type
  if (k.includes('email') || k === 'mail') return 'email'
  if (k === 'qnt' || k.includes('quantity') || k.includes('qty')) return 'number'
  if (k.includes('password') || k === 'pass') return 'password'
  if (k.includes('comment') || k.includes('note') || k.includes('catatan')) return 'textarea'
  return 'text'
}

function itemToFieldDef(item: unknown, index: number): ServerFieldDef | null {
  if (typeof item === 'string') {
    const key = item.trim()
    if (!key) return null
    const preset = PRESET_BY_KEY.get(normalizeFieldKey(key))
    return {
      key: preset?.key ?? normalizeFieldKey(key),
      label: preset?.label ?? labelForFieldKey(key),
      required: true,
      type: preset?.type ?? inferTypeFromKey(key),
    }
  }

  if (!item || typeof item !== 'object') return null
  const f = item as Record<string, unknown>
  const rawKey = String(f.key ?? f.name ?? f.fieldname ?? f.field ?? `field_${index}`).trim()
  if (!rawKey || rawKey === 'undefined') return null

  const key = PRESET_BY_KEY.get(normalizeFieldKey(rawKey))?.key ?? normalizeFieldKey(rawKey)
  const preset = PRESET_BY_KEY.get(key)

  const typeRaw = String(f.type ?? '').toLowerCase()
  let type: ServerFieldType = preset?.type ?? inferTypeFromKey(key)
  if (typeRaw === 'email' || typeRaw === 'number' || typeRaw === 'password' || typeRaw === 'textarea') {
    type = typeRaw
  } else if (typeRaw === 'text') {
    type = 'text'
  }

  return {
    key,
    label: String(f.label ?? preset?.label ?? labelForFieldKey(rawKey)).trim(),
    required: Boolean(f.required ?? f.mandatory ?? true),
    type,
  }
}

/** Parse `ServerService.requiredFields` JSON from DB or supplier sync. */
export function parseServerFieldDefs(raw: string | null | undefined): ServerFieldDef[] {
  if (!raw?.trim()) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (Array.isArray(data)) {
      return data
        .map((item, index) => itemToFieldDef(item, index))
        .filter((x): x is ServerFieldDef => x !== null)
    }
    return []
  } catch {
    return []
  }
}

export function serializeServerFieldDefs(defs: ServerFieldDef[]): string {
  return JSON.stringify(
    defs.map((d) => ({
      key: d.key,
      label: d.label,
      required: d.required,
      type: d.type,
    })),
  )
}

export interface ValidateServerOrderFieldsResult {
  ok: boolean
  error?: string
  fields: Record<string, string>
  email: string | null
  notes: string | null
}

/** Validate user-submitted values against service field definitions. */
export function validateServerOrderFields(
  fieldDefs: ServerFieldDef[],
  submitted: Record<string, string> | undefined,
): ValidateServerOrderFieldsResult {
  const input = submitted ?? {}
  const fields: Record<string, string> = {}
  let email: string | null = null
  let notes: string | null = null

  if (fieldDefs.length === 0) {
    return {
      ok: false,
      error: 'Service order fields are not configured. Contact admin.',
      fields: {},
      email: null,
      notes: null,
    }
  }

  for (const def of fieldDefs) {
    const raw = input[def.key] ?? input[normalizeFieldKey(def.key)] ?? ''
    const value = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()

    if (def.required && !value) {
      return {
        ok: false,
        error: `${def.label} is required`,
        fields: {},
        email: null,
        notes: null,
      }
    }

    if (!value) continue

    if (def.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return {
        ok: false,
        error: `${def.label} is invalid`,
        fields: {},
        email: null,
        notes: null,
      }
    }

    if (def.type === 'number' && (Number.isNaN(Number(value)) || Number(value) <= 0)) {
      return {
        ok: false,
        error: `${def.label} must be a positive number`,
        fields: {},
        email: null,
        notes: null,
      }
    }

    fields[def.key] = value

    const nk = normalizeFieldKey(def.key)
    if (nk === 'email' || def.type === 'email') email = value
    if (nk === 'comments' || nk === 'notes' || nk === 'catatan') notes = value
  }

  return { ok: true, fields, email, notes }
}

/** Format stored order field JSON for display with labels. */
export function formatOrderFieldEntries(
  requiredFieldsJson: string | null,
  serviceFieldDefsJson?: string | null,
): { label: string; value: string }[] {
  let values: Record<string, string> = {}
  try {
    if (requiredFieldsJson) {
      const parsed = JSON.parse(requiredFieldsJson) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        values = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
        )
      }
    }
  } catch {
    return []
  }

  const defs = parseServerFieldDefs(serviceFieldDefsJson ?? null)
  const labelByKey = new Map(defs.map((d) => [normalizeFieldKey(d.key), d.label]))

  return Object.entries(values).map(([key, value]) => ({
    label: labelByKey.get(normalizeFieldKey(key)) ?? labelForFieldKey(key),
    value,
  }))
}
