/** Shared validation for IMEI order device identifiers. */

export type ImeiServiceFieldFlags = {
  requiresImei: boolean
  requiresSn: boolean
}

export type ImeiOrderInputPayload = {
  imei?: string
  serialNumber?: string | null
}

function validateImeiValue(value: string): string | null {
  if (!value.trim()) return 'IMEI is required'
  return null
}

function validateSerialNumberValue(value: string): string | null {
  if (!value.trim()) return 'Serial Number is required'
  return null
}

export function validateImeiOrderDeviceInput(
  service: ImeiServiceFieldFlags,
  payload: ImeiOrderInputPayload,
): { imei: string; serialNumber: string | null; error: string | null } {
  const imeiRaw = (payload.imei ?? '').trim()
  const snRaw = (payload.serialNumber ?? '').trim()

  if (service.requiresImei) {
    const imeiErr = validateImeiValue(imeiRaw)
    if (imeiErr) return { imei: imeiRaw, serialNumber: snRaw || null, error: imeiErr }
  }

  let serialNumber: string | null = null
  if (service.requiresSn) {
    const snValue = snRaw || (!service.requiresImei ? imeiRaw : '')
    const snErr = validateSerialNumberValue(snValue)
    if (snErr) return { imei: imeiRaw, serialNumber: snValue || null, error: snErr }
    serialNumber = snValue.trim()
  }

  if (!service.requiresImei && !service.requiresSn) {
    return {
      imei: imeiRaw,
      serialNumber,
      error: 'Service is not configured (IMEI or Serial Number)',
    }
  }

  const deviceKey = service.requiresImei ? imeiRaw : (serialNumber ?? '')
  return { imei: deviceKey, serialNumber, error: null }
}
