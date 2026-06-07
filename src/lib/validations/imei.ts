import { z } from 'zod'

// ============================================================
// IMEI API Provider
// ============================================================

export const createImeiApiSchema = z.object({
  title: z.string().min(2, 'Name must be at least 2 characters').max(255),
  host: z.string().url('Host must be a valid URL').max(255),
  username: z.string().min(2, 'Username must be at least 2 characters').max(255),
  apiKey: z.string().min(4, 'API Key must be at least 4 characters').max(1024),
  apiType: z.string().default('DhruFusion'),
  libraryId: z.number().int().positive().default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().max(2000).optional().nullable(),
})

export const updateImeiApiSchema = createImeiApiSchema.partial()

export type CreateImeiApiInput = z.infer<typeof createImeiApiSchema>
export type UpdateImeiApiInput = z.infer<typeof updateImeiApiSchema>

// ============================================================
// IMEI Service Group
// ============================================================

export const createImeiServiceGroupSchema = z.object({
  title: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2048).optional().nullable(),
  marketplaceVisible: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().default(0),
})

export const updateImeiServiceGroupSchema = createImeiServiceGroupSchema.partial()

export type CreateImeiServiceGroupInput = z.infer<typeof createImeiServiceGroupSchema>
export type UpdateImeiServiceGroupInput = z.infer<typeof updateImeiServiceGroupSchema>

// ============================================================
// IMEI Service
// ============================================================

export const createImeiServiceSchema = z.object({
  apiId: z.string().min(1, 'API provider is required'),
  groupId: z.string().min(1, 'Service group is required'),
  toolId: z.string().max(255).optional().nullable(),
  title: z.string().min(2, 'Name must be at least 2 characters').max(500),
  description: z.string().max(50000).optional().nullable(),
  price: z.number().nonnegative('Price cannot be negative').or(z.string().transform((v) => Number(v))),
  deliveryTime: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),

  requiresImei: z.boolean().default(true),
  requiresNetwork: z.boolean().default(false),
  requiresModel: z.boolean().default(false),
  requiresProvider: z.boolean().default(false),
  requiresPin: z.boolean().default(false),
  requiresKbh: z.boolean().default(false),
  requiresMep: z.boolean().default(false),
  requiresPrd: z.boolean().default(false),
  requiresSn: z.boolean().default(false),
  requiresEcid: z.boolean().default(false),
})

export const updateImeiServiceSchema = createImeiServiceSchema.partial()

export type CreateImeiServiceInput = z.infer<typeof createImeiServiceSchema>
export type UpdateImeiServiceInput = z.infer<typeof updateImeiServiceSchema>

// ============================================================
// IMEI Order
// ============================================================

export const createImeiOrderSchema = z.object({
  serviceId: z.string().min(1, 'Service is required'),
  /** Skip local duplicate block after user confirms in UI. */
  acknowledgeDuplicate: z.boolean().optional().default(false),
  imei: z.string().optional().default(''),
  network: z.string().max(255).optional().nullable(),
  model: z.string().max(255).optional().nullable(),
  provider: z.string().max(255).optional().nullable(),
  pin: z.string().max(100).optional().nullable(),
  kbh: z.string().max(100).optional().nullable(),
  mep: z.string().max(100).optional().nullable(),
  prd: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  ecid: z.string().max(100).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),

  // ─── Dhru-compatible callback (optional, additive) ───────────────
  // Accept both snake_case (Dhru) and camelCase. The route passes the raw
  // body through extractFeedbackInput() for SSRF-safe handling, so these
  // are only declared to be passthrough-tolerant. They never affect the
  // order flow when omitted.
  feedback_url: z.string().max(2048).optional().nullable(),
  feedbackUrl: z.string().max(2048).optional().nullable(),
  reference_id: z.string().max(255).optional().nullable(),
  referenceId: z.string().max(255).optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  Quantity: z.union([z.number(), z.string()]).optional().nullable(),
})

export const updateImeiOrderSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROCESS', 'SUCCESS', 'REJECTED', 'CANCELLED']).optional(),
  code: z.string().max(5000).optional().nullable(),
  comments: z.string().max(2000).optional().nullable(),
  referenceId: z.string().max(255).optional().nullable(),
})

export type CreateImeiOrderInput = z.infer<typeof createImeiOrderSchema>
export type UpdateImeiOrderInput = z.infer<typeof updateImeiOrderSchema>
