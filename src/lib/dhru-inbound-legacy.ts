/**
 * Backward-compatible Dhru Fusion inbound action names and flat form-field
 * normalization for /api/index.php.
 *
 * Additive only — modern clients using `parameters` XML are unchanged.
 */

const PLACE_ACTIONS = new Set(['placeimeiorder', 'placeserverorder', 'placeorder']);
const STATUS_ACTIONS = new Set(['getimeiorder', 'getstatus', 'getserverorder']);

const SKIP_FORM_KEYS = new Set([
  'username',
  'apiaccesskey',
  'action',
  'parameters',
  'requestformat',
]);

/** Flat legacy field → classic XML tag name. */
const LEGACY_FIELD_ALIASES: Record<string, string> = {
  SERVICE_ID: 'ID',
  SERVICEID: 'ID',
  ORDER_ID: 'ID',
  REF: 'REFERENCE_ID',
  REFERENCE: 'REFERENCE_ID',
  CUSTOMREFERENCE: 'REFERENCE_ID',
};

export function isDhruPlaceAction(action: string): boolean {
  return PLACE_ACTIONS.has(action.trim().toLowerCase());
}

export function isDhruStatusAction(action: string): boolean {
  return STATUS_ACTIONS.has(action.trim().toLowerCase());
}

function readFlatFormFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  form.forEach((value, key) => {
    const rawKey = key.trim().toLowerCase().replace(/-/g, '_');
    if (SKIP_FORM_KEYS.has(rawKey)) return;
    const text = String(value ?? '').trim();
    if (!text) return;
    const normalizedKey = rawKey.toUpperCase();
    const target = LEGACY_FIELD_ALIASES[normalizedKey] ?? normalizedKey;
    out[target] = text;
  });
  return out;
}

/**
 * Merge XML `parameters` with optional top-level legacy fields.
 * Parsed XML wins when both define the same key.
 */
export function normalizeDhruInboundParameters(
  action: string,
  form: FormData,
  xmlParams: Record<string, string>,
): Record<string, string> {
  const a = action.trim().toLowerCase();
  if (!isDhruPlaceAction(a) && !isDhruStatusAction(a)) {
    return xmlParams;
  }

  const flat = readFlatFormFields(form);
  if (Object.keys(flat).length === 0) return xmlParams;

  return { ...flat, ...xmlParams };
}
