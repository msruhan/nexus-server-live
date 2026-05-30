import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const VERSION = 'v1'
const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const DEK_LEN = 32

export class CryptoKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CryptoKeyError'
  }
}

function decodeKek(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim()
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new CryptoKeyError('DATA_ENCRYPTION_KEY is required in production')
    }
    return Buffer.alloc(DEK_LEN, 0)
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== DEK_LEN) {
    throw new CryptoKeyError('DATA_ENCRYPTION_KEY must be 32 bytes (base64-encoded)')
  }
  return buf
}

let kekCache: Buffer | null = null

function getKek(): Buffer {
  if (!kekCache) kekCache = decodeKek()
  return kekCache
}

export function assertCryptoConfigured(): void {
  void getKek()
}

function encryptWithKey(plain: Buffer, key: Buffer): { iv: string; tag: string; ct: string } {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ct: encrypted.toString('base64url'),
  }
}

function decryptWithKey(ivB64: string, tagB64: string, ctB64: string, key: Buffer): Buffer {
  const iv = Buffer.from(ivB64, 'base64url')
  const tag = Buffer.from(tagB64, 'base64url')
  const ct = Buffer.from(ctB64, 'base64url')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

/**
 * Envelope encrypt: per-value DEK wrapped by KEK.
 * Format:
 *   v1:<dekIv>:<dekTag>:<dekCt>:<iv>:<tag>:<ct>
 * (all base64url except version).
 */
export function encryptString(plaintext: string): string {
  const kek = getKek()
  const dek = randomBytes(DEK_LEN)
  const wrapped = encryptWithKey(dek, kek)
  const payload = encryptWithKey(Buffer.from(plaintext, 'utf8'), dek)
  return [VERSION, wrapped.iv, wrapped.tag, wrapped.ct, payload.iv, payload.tag, payload.ct].join(':')
}

export function decryptString(ciphertext: string): string {
  if (!ciphertext.startsWith(`${VERSION}:`)) {
    return ciphertext
  }
  const parts = ciphertext.split(':')
  // Back-compat: earlier draft stored 5 parts using the *same* IV/TAG.
  // New format stores separate IV/TAG for wrapped DEK and payload.
  if (parts.length !== 7 && parts.length !== 5) {
    throw new CryptoKeyError('Invalid ciphertext format')
  }
  const kek = getKek()

  if (parts.length === 5) {
    const [, dekCt, iv, tag, ct] = parts
    const dek = decryptWithKey(iv, tag, dekCt, kek)
    const plain = decryptWithKey(iv, tag, ct, dek)
    return plain.toString('utf8')
  }

  const [, dekIv, dekTag, dekCt, iv, tag, ct] = parts
  const dek = decryptWithKey(dekIv, dekTag, dekCt, kek)
  const plain = decryptWithKey(iv, tag, ct, dek)
  return plain.toString('utf8')
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${VERSION}:`)
}
