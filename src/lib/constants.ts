// Status constants — 1:1 IndoTeknizi order lifecycle

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ApiStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ApiStatus = (typeof ApiStatus)[keyof typeof ApiStatus];

export const ServiceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

/** IndoTeknizi ImeiOrderStatus / ServerOrderStatus */
export const OrderStatus = {
  PENDING: 'PENDING',
  IN_PROCESS: 'IN_PROCESS',
  SUCCESS: 'SUCCESS',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const LedgerType = {
  TOPUP: 'TOPUP',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
} as const;
export type LedgerType = (typeof LedgerType)[keyof typeof LedgerType];

export const TopupStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type TopupStatus = (typeof TopupStatus)[keyof typeof TopupStatus];

/** @deprecated Use mapDhruStatusToOrderStatus from imei-order-worker */
export function mapDhruStatus(value: string): OrderStatus | null {
  const v = value.toLowerCase();
  if (v === '0' || v === 'new') return OrderStatus.IN_PROCESS;
  if (v === '1' || v === 'in process' || v === 'inprocess') return OrderStatus.IN_PROCESS;
  if (v === '4' || v === 'completed' || v === 'success') return OrderStatus.SUCCESS;
  if (v === '3' || v === 'rejected') return OrderStatus.REJECTED;
  if (v === 'cancelled' || v === 'canceled') return OrderStatus.CANCELLED;
  return null;
}
