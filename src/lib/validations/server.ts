import { z } from 'zod'
import { serializeServerFieldDefs } from '@/lib/server-fields'

export const serverFieldDefSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  required: z.boolean(),
  type: z.enum(['text', 'email', 'number', 'password', 'textarea']).default('text'),
})

export const createServerServiceSchema = z.object({
  sourceType: z.enum(['PROVIDER_SYNCED', 'MANUAL']).default('PROVIDER_SYNCED'),
  apiId: z.string().min(1, 'API provider is required').optional().nullable(),
  boxId: z.string().min(1, 'Server group is required'),
  toolId: z.string().max(255).optional().nullable(),
  title: z.string().min(2).max(500),
  description: z.string().max(50000).optional().nullable(),
  price: z.number().nonnegative(),
  deliveryTime: z.string().max(100).optional().nullable(),
  quantity: z.number().int().positive().default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  fieldDefs: z.array(serverFieldDefSchema).optional(),
  requiredFields: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.sourceType === 'PROVIDER_SYNCED') {
    if (!data.apiId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['apiId'], message: 'API provider is required' })
    }
    if (!data.toolId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toolId'], message: 'Provider service ID is required' })
    }
  }
  if (data.sourceType === 'MANUAL') {
    if (data.apiId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['apiId'], message: 'Manual service must not be linked to an API provider' })
    }
    if (data.toolId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toolId'], message: 'Manual service must not have a provider service ID' })
    }
  }
});

export const updateServerServiceSchema = z.object({
  title: z.string().min(2).max(500).optional(),
  description: z.string().max(50000).optional().nullable(),
  price: z.number().nonnegative().optional(),
  deliveryTime: z.string().max(100).optional().nullable(),
  quantity: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  boxId: z.string().optional(),
  /** Preferred: structured field definitions from admin UI */
  fieldDefs: z.array(serverFieldDefSchema).optional(),
  /** Legacy: raw JSON string */
  requiredFields: z.string().optional().nullable(),
})

export type UpdateServerServiceInput = z.infer<typeof updateServerServiceSchema>

export function resolveRequiredFieldsFromUpdate(
  data: UpdateServerServiceInput,
): { requiredFields?: string | null } {
  if (data.fieldDefs !== undefined) {
    return {
      requiredFields:
        data.fieldDefs.length > 0 ? serializeServerFieldDefs(data.fieldDefs) : null,
    }
  }
  if (data.requiredFields !== undefined) {
    return { requiredFields: data.requiredFields }
  }
  return {}
}

export const createServerOrderSchema = z.object({
  serviceId: z.string().min(1),
  /** Skip local duplicate block after user confirms in UI. */
  acknowledgeDuplicate: z.boolean().optional().default(false),
  requiredFields: z.record(z.string(), z.string()).optional().default({}),

  // ─── Dhru-compatible callback (optional, additive) ───────────────
  // See createImeiOrderSchema for the rationale. The route handles these
  // via extractFeedbackInput(); declared here so they pass validation.
  feedback_url: z.string().max(2048).optional().nullable(),
  feedbackUrl: z.string().max(2048).optional().nullable(),
  reference_id: z.string().max(255).optional().nullable(),
  referenceId: z.string().max(255).optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  Quantity: z.union([z.number(), z.string()]).optional().nullable(),
})
