/** IMEI khusus functional test saat STRESS_TEST_MODE=true (suffix 2 digit terakhir). */
export const IMEI_STRESS_SUCCESS = '353456789012340'
export const IMEI_STRESS_REJECT_POLL = '353456789012341'
export const IMEI_STRESS_CREDIT = '353456789012342'
export const IMEI_STRESS_TIMEOUT = '353456789012343'

const STRESS_SUFFIX = {
  success: '40',
  reject: '41',
  credit: '42',
  timeout: '43',
} as const

export type ImeiStressKind = keyof typeof STRESS_SUFFIX

/** IMEI 15 digit unik per run; perilaku mock mengikuti 2 digit akhir. */
export function buildStressImei(kind: ImeiStressKind): string {
  const suffix = STRESS_SUFFIX[kind]
  const mid = String(Date.now() % 1e11).padStart(11, '0')
  return `35${mid}${suffix}`
}

function stressSuffix(imei: string): string | null {
  if (!/^\d{15}$/.test(imei) || !imei.startsWith('35')) return null
  return imei.slice(-2)
}

export function isImeiStressSuccess(imei: string): boolean {
  return imei === IMEI_STRESS_SUCCESS || stressSuffix(imei) === STRESS_SUFFIX.success
}

export function isImeiStressRejectPoll(imei: string): boolean {
  return imei === IMEI_STRESS_REJECT_POLL || stressSuffix(imei) === STRESS_SUFFIX.reject
}

export function isImeiStressCredit(imei: string): boolean {
  return imei === IMEI_STRESS_CREDIT || stressSuffix(imei) === STRESS_SUFFIX.credit
}

export function isImeiStressTimeout(imei: string): boolean {
  return imei === IMEI_STRESS_TIMEOUT || stressSuffix(imei) === STRESS_SUFFIX.timeout
}
