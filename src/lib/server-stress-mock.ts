/** Email khusus functional test server order saat STRESS_TEST_MODE=true. */
export const SERVER_STRESS_SUCCESS = 'ft-server-success@stress.test'
export const SERVER_STRESS_REJECT_POLL = 'ft-server-reject@stress.test'
export const SERVER_STRESS_CREDIT = 'ft-server-credit@stress.test'
export const SERVER_STRESS_TIMEOUT = 'ft-server-timeout@stress.test'

export type ServerStressKind = 'success' | 'reject' | 'credit' | 'timeout'

export function buildStressServerEmail(kind: ServerStressKind): string {
  const token = { success: 'success', reject: 'reject', credit: 'credit', timeout: 'timeout' }[kind]
  return `ft-server-${token}-${Date.now()}@stress.test`
}

export function extractServerStressEmail(requiredFieldsJson: string | null | undefined): string {
  if (!requiredFieldsJson?.trim()) return ''
  try {
    const parsed = JSON.parse(requiredFieldsJson) as Record<string, unknown>
    return String(parsed.email ?? parsed.EMAIL ?? '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function matchesStressToken(email: string, token: string): boolean {
  return email === `ft-server-${token}@stress.test` || email.includes(`ft-server-${token}-`)
}

export function isServerStressSuccess(email: string): boolean {
  return matchesStressToken(email, 'success')
}

export function isServerStressRejectPoll(email: string): boolean {
  return matchesStressToken(email, 'reject')
}

export function isServerStressCredit(email: string): boolean {
  return matchesStressToken(email, 'credit')
}

export function isServerStressTimeout(email: string): boolean {
  return matchesStressToken(email, 'timeout')
}
