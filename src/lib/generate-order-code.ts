import { randomBytes } from 'crypto';

/** Uppercase A–Z and 2–9 (skip 0/O and 1/I for readability). */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ORDER_CODE_PREFIX = 'ID-';

const SUFFIX_LENGTH = 12;

/** `ID-` + random alphanumeric suffix (e.g. ID-K7VN3P2WXR9M). */
export function generateOrderCode(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += CHARSET[bytes[i]! % CHARSET.length];
  }
  return `${ORDER_CODE_PREFIX}${suffix}`;
}

/** Validates current + legacy order code shapes. */
export const ORDER_CODE_PATTERN =
  /^(?:ID-[A-Z0-9]{8,16}|[A-Z0-9]{8,16}|(?:IMEI|SN|SRV)-\d{2,4}-[A-Z0-9]{4,12})$/i;

export function isValidOrderCode(value: string): boolean {
  return ORDER_CODE_PATTERN.test(value.trim().toUpperCase());
}
