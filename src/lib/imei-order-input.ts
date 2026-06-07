/** Shared validation for IMEI order device identifiers. */

export type ImeiServiceFieldFlags = {
  requiresImei: boolean
  requiresSn: boolean
  requiresEcid: boolean
}

export type ImeiOrderInputPayload = {
  imei?: string
  serialNumber?: string | null
  ecid?: string | null
}

function validateImeiValue(value: string): string | null {
  if (!value.trim()) return 'IMEI is required'
  return null
}

function validateSerialNumberValue(value: string): string | null {
  if (!value.trim()) return 'Serial Number is required'
  return null
}

function validateEcidValue(value: string): string | null {
  if (!value.trim()) return 'ECID is required'
  return null
}

function resolveDeviceKey(
  service: ImeiServiceFieldFlags,
  imeiRaw: string,
  serialNumber: string | null,
  ecid: string | null,
): string {
  if (service.requiresImei) return imeiRaw
  if (service.requiresSn && serialNumber) return serialNumber
  if (service.requiresEcid && ecid) return ecid
  return imeiRaw || serialNumber || ecid || ''
}

export function validateImeiOrderDeviceInput(
  service: ImeiServiceFieldFlags,
  payload: ImeiOrderInputPayload,
): { imei: string; serialNumber: string | null; ecid: string | null; error: string | null } {
  const imeiRaw = (payload.imei ?? '').trim()
  const snRaw = (payload.serialNumber ?? '').trim()
  const ecidRaw = (payload.ecid ?? '').trim()

  if (service.requiresImei) {
    const imeiErr = validateImeiValue(imeiRaw)
    if (imeiErr) return { imei: imeiRaw, serialNumber: snRaw || null, ecid: ecidRaw || null, error: imeiErr }
  }

  let serialNumber: string | null = null
  if (service.requiresSn) {
    const snValue = snRaw || (!service.requiresImei && !service.requiresEcid ? imeiRaw : '')
    const snErr = validateSerialNumberValue(snValue)
    if (snErr) return { imei: imeiRaw, serialNumber: snValue || null, ecid: ecidRaw || null, error: snErr }
    serialNumber = snValue.trim()
  }

  let ecid: string | null = null
  if (service.requiresEcid) {
    const ecidValue = ecidRaw || (!service.requiresImei && !service.requiresSn ? imeiRaw : '')
    const ecidErr = validateEcidValue(ecidValue)
    if (ecidErr) return { imei: imeiRaw, serialNumber, ecid: ecidValue || null, error: ecidErr }
    ecid = ecidValue.trim()
  }

  if (!service.requiresImei && !service.requiresSn && !service.requiresEcid) {
    return {
      imei: imeiRaw,
      serialNumber,
      ecid,
      error: 'Service is not configured (IMEI, Serial Number, or ECID)',
    }
  }

  const deviceKey = resolveDeviceKey(service, imeiRaw, serialNumber, ecid)
  return { imei: deviceKey, serialNumber, ecid, error: null }
}

export type ImeiOrderSubmittedFieldFlags = {
  requiresImei: boolean
  requiresSn: boolean
  requiresEcid: boolean
  requiresNetwork: boolean
  requiresModel: boolean
  requiresProvider: boolean
  requiresPin: boolean
  requiresKbh: boolean
  requiresMep: boolean
  requiresPrd: boolean
}

export type ImeiOrderSubmittedValues = {
  imei: string
  network?: string | null
  model?: string | null
  provider?: string | null
  pin?: string | null
  kbh?: string | null
  mep?: string | null
  prd?: string | null
  serialNumber?: string | null
  ecid?: string | null
}

/** Submitted fields for order detail — only service-required inputs the user filled. */
export function buildImeiOrderSubmittedFields(
  order: ImeiOrderSubmittedValues,
  service: ImeiOrderSubmittedFieldFlags,
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = []

  const push = (label: string, raw: string | null | undefined) => {
    const v = raw?.trim()
    if (v) out.push({ label, value: v })
  }

  if (service.requiresImei) {
    push('IMEI', order.imei)
  } else if (service.requiresSn) {
    push('Serial Number', order.serialNumber ?? order.imei)
  } else if (service.requiresEcid) {
    push('ECID', order.ecid ?? order.imei)
  }

  if (service.requiresSn && service.requiresImei) {
    push('Serial Number', order.serialNumber)
  }

  if (service.requiresEcid && (service.requiresImei || service.requiresSn)) {
    push('ECID', order.ecid)
  }

  if (service.requiresNetwork) push('Network / Carrier', order.network)
  if (service.requiresModel) push('Model', order.model)
  if (service.requiresProvider) push('Provider', order.provider)
  if (service.requiresPin) push('PIN', order.pin)
  if (service.requiresKbh) push('KBH code', order.kbh)
  if (service.requiresMep) push('MEP code', order.mep)
  if (service.requiresPrd) push('PRD code', order.prd)

  return out
}

/** Avoid showing the same supplier message twice (comments prefix + code body). */
export function formatSupplierResponseDisplay(
  comments: string | null | undefined,
  code: string | null | undefined,
): { primary: string; secondary: string | null } {
  const c = comments?.trim() ?? ''
  const k = code?.trim() ?? ''
  if (c) {
    const secondary = k && k !== c && !c.includes(k) ? k : null
    return { primary: c, secondary }
  }
  if (k) return { primary: k, secondary: null }
  return { primary: '', secondary: null }
}
