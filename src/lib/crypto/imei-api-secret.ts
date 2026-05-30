import {
  decryptSecretField,
  encryptSecretField,
  hasStoredSecret,
  MASKED_SECRET,
  maskSecretForResponse,
} from '@/lib/crypto/secret-field'

export function decryptImeiApiKey(stored: string): string {
  return decryptSecretField(stored) ?? ''
}

export function encryptImeiApiKeyForStorage(apiKey: string): string {
  return encryptSecretField(apiKey.trim())
}

export type ImeiApiWithKey = {
  apiKey: string
  [key: string]: unknown
}

/** Strip raw API key from admin API responses. */
export function sanitizeImeiApiForAdmin<T extends ImeiApiWithKey>(
  record: T,
): Omit<T, 'apiKey'> & { apiKey: string; hasApiKey: boolean } {
  const { apiKey, ...rest } = record
  return {
    ...rest,
    apiKey: maskSecretForResponse(apiKey),
    hasApiKey: hasStoredSecret(apiKey),
  } as Omit<T, 'apiKey'> & { apiKey: string; hasApiKey: boolean }
}

export function sanitizeImeiApiListForAdmin<T extends ImeiApiWithKey>(records: T[]) {
  return records.map(sanitizeImeiApiForAdmin)
}

/** Encrypt apiKey on create/update; skip masked placeholder on PATCH. */
export function prepareImeiApiWriteData<T extends { apiKey?: string }>(data: T): T {
  if (data.apiKey === undefined) return data
  if (!data.apiKey.trim() || data.apiKey === MASKED_SECRET) {
    const { apiKey: _removed, ...rest } = data
    return rest as T
  }
  return { ...data, apiKey: encryptImeiApiKeyForStorage(data.apiKey) }
}
