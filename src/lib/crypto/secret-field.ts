import { decryptString, encryptString, isEncryptedValue } from '@/lib/crypto/encryption'

export { isEncryptedValue }

export const MASKED_SECRET = '••••••••'

/** Encrypt for DB storage (idempotent if already encrypted). */
export function encryptSecretField(plaintext: string): string {
  if (!plaintext || isEncryptedValue(plaintext)) return plaintext
  return encryptString(plaintext)
}

/** Decrypt from DB; plaintext legacy values pass through. */
export function decryptSecretField(value: string | null | undefined): string | null {
  if (!value) return null
  return decryptString(value)
}

export function maskSecretForResponse(value: string | null | undefined): string {
  if (!value) return ''
  return MASKED_SECRET
}

export function hasStoredSecret(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}
