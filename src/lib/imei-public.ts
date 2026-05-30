/** Types & helpers for public IMEI catalog (user/teknisi) from admin DB. */

export type ImeiOrderStatusUi =
  | 'PENDING'
  | 'IN_PROCESS'
  | 'SUCCESS'
  | 'REJECTED'
  | 'CANCELLED'

export interface PublicImeiService {
  id: string
  title: string
  description: string | null
  groupId: string
  groupName: string
  price: number
  deliveryTime: string
  requiresImei: boolean
  requiresNetwork: boolean
  requiresModel: boolean
  requiresProvider: boolean
  requiresPin: boolean
  requiresKbh: boolean
  requiresMep: boolean
  requiresPrd: boolean
  requiresSn: boolean
}

export interface PublicImeiServiceGroup {
  id: string
  title: string
  servicesCount: number
}

export interface PublicServerService {
  id: string
  title: string
  description: string | null
  boxId: string
  boxName: string
  price: number
  deliveryTime: string
  fieldDefs: ServerFieldDef[]
}

export interface PublicServerServiceBox {
  id: string
  title: string
  servicesCount: number
}

import { parseServerFieldDefs, type ServerFieldDef } from '@/lib/server-fields'
export type { ServerFieldDef, ServerFieldType } from '@/lib/server-fields'
export { parseServerFieldDefs, labelForFieldKey } from '@/lib/server-fields'

export interface PublicImeiOrder {
  id: string
  orderCode: string
  imei: string
  serviceName: string
  price: number
  status: ImeiOrderStatusUi
  /** Kolom CODE dari supplier (luteam / Dhru) — hasil sukses atau pesan penolakan. */
  code: string | null
  /** Catatan internal sistem/admin (bukan dari supplier). */
  comments: string | null
  referenceId: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export function stripSupplierHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Normalisasi teks kolom CODE supplier (hapus HTML, nilai kosong). */
export function normalizeSupplierCode(value: string | null | undefined): string | null {
  if (!value) return null
  const clean = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean || clean === '0' || clean.toLowerCase() === 'null') return null
  return clean
}

export function isSystemComment(comments: string | null | undefined): boolean {
  if (!comments?.trim()) return false
  return (
    comments.startsWith('[') ||
    comments.includes('[Koreksi sistem]') ||
    comments.includes('[Duplikat') ||
    comments.includes('[Rejected on submit') ||
    comments.includes('[Rejected after supplier') ||
    comments.includes('[Rejected by supplier') ||
    comments.includes('[Ditolak saat kirim') ||
    comments.includes('Supplier menolak order:')
  )
}

export function toNumberPrice(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') return Number(value) || 0
  if (value && typeof value === 'object' && 'toString' in value) {
    return Number(String(value)) || 0
  }
  return 0
}

export function formatImeiPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

export function formatImeiDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function mapApiService(raw: {
  id: string
  title: string
  description?: string | null
  price: unknown
  deliveryTime?: string | null
  requiresImei?: boolean
  requiresNetwork?: boolean
  requiresModel?: boolean
  requiresProvider?: boolean
  requiresPin?: boolean
  requiresKbh?: boolean
  requiresMep?: boolean
  requiresPrd?: boolean
  requiresSn?: boolean
  group: { id: string; title: string }
}): PublicImeiService {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    groupId: raw.group.id,
    groupName: raw.group.title,
    price: toNumberPrice(raw.price),
    deliveryTime: raw.deliveryTime?.trim() || '—',
    requiresImei: raw.requiresImei ?? true,
    requiresNetwork: raw.requiresNetwork ?? false,
    requiresModel: raw.requiresModel ?? false,
    requiresProvider: raw.requiresProvider ?? false,
    requiresPin: raw.requiresPin ?? false,
    requiresKbh: raw.requiresKbh ?? false,
    requiresMep: raw.requiresMep ?? false,
    requiresPrd: raw.requiresPrd ?? false,
    requiresSn: raw.requiresSn ?? false,
  }
}

export function mapApiGroup(raw: {
  id: string
  title: string
  _count?: { services: number }
}): PublicImeiServiceGroup {
  return {
    id: raw.id,
    title: raw.title,
    servicesCount: raw._count?.services ?? 0,
  }
}

export function mapApiServerService(raw: {
  id: string
  title: string
  description?: string | null
  price: unknown
  deliveryTime?: string | null
  requiredFields?: string | null
  box: { id: string; title: string }
}): PublicServerService {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    boxId: raw.box.id,
    boxName: raw.box.title,
    price: toNumberPrice(raw.price),
    deliveryTime: raw.deliveryTime?.trim() || '—',
    fieldDefs: parseServerFieldDefs(raw.requiredFields),
  }
}

export function mapApiServerBox(raw: {
  id: string
  title: string
  _count?: { services: { where?: unknown } | number }
}): PublicServerServiceBox {
  const count = raw._count?.services
  return {
    id: raw.id,
    title: raw.title,
    servicesCount: typeof count === 'number' ? count : 0,
  }
}

export interface PublicServerOrder {
  id: string
  orderCode: string
  serviceName: string
  boxName: string | null
  price: number
  status: ImeiOrderStatusUi
  code: string | null
  comments: string | null
  email: string | null
  notes: string | null
  requiredFields: string | null
  serviceRequiredFields: string | null
  referenceId: string | null
  createdAt: string
  updatedAt: string
}

export function mapApiServerOrder(raw: {
  id: string
  orderCode: string
  price: unknown
  status: string
  code?: string | null
  comments?: string | null
  email?: string | null
  notes?: string | null
  requiredFields?: string | null
  referenceId?: string | null
  createdAt: string
  updatedAt: string
  service?: {
    title?: string
    requiredFields?: string | null
    box?: { title?: string } | null
  } | null
}): PublicServerOrder {
  return {
    id: raw.id,
    orderCode: raw.orderCode,
    serviceName: raw.service?.title ?? '—',
    boxName: raw.service?.box?.title ?? null,
    price: toNumberPrice(raw.price),
    status: raw.status as ImeiOrderStatusUi,
    code: normalizeSupplierCode(raw.code),
    comments: raw.comments ?? null,
    email: raw.email ?? null,
    notes: raw.notes ?? null,
    requiredFields: raw.requiredFields ?? null,
    serviceRequiredFields: raw.service?.requiredFields ?? null,
    referenceId: raw.referenceId ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export function mapApiOrder(raw: {
  id: string
  orderCode: string
  imei: string
  price: unknown
  status: string
  code?: string | null
  comments?: string | null
  note?: string | null
  referenceId?: string | null
  createdAt: string
  updatedAt: string
  service?: { title?: string } | null
}): PublicImeiOrder {
  return {
    id: raw.id,
    orderCode: raw.orderCode,
    imei: raw.imei,
    serviceName: raw.service?.title ?? '—',
    price: toNumberPrice(raw.price),
    status: raw.status as ImeiOrderStatusUi,
    code: normalizeSupplierCode(raw.code),
    comments: raw.comments ?? null,
    referenceId: raw.referenceId ?? null,
    note: raw.note ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}
