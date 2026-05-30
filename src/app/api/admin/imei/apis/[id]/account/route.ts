import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiRole } from '@/lib/api-auth'
import { decryptImeiApiKey } from '@/lib/crypto/imei-api-secret'
import { DhruFusionClient } from '@/lib/dhru-fusion'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/imei/apis/[id]/account
 * Check reseller API balance/credit at supplier (accountinfo).
 * CreditprocessError usually means this credit is depleted — not a $0 service price.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiRole(['ADMIN'])
  if (error) return error

  try {
    const { id } = await context.params
    const api = await prisma.imeiApi.findUnique({ where: { id } })
    if (!api) return apiError('API provider not found', 404)
    if (api.status !== 'ACTIVE') return apiError('API provider is not active', 400)
    if (api.apiType !== 'DhruFusion') {
      return apiError('Balance check is only available for DhruFusion Classic', 400)
    }

    const client = new DhruFusionClient({
      host: api.host,
      username: api.username,
      apiKey: decryptImeiApiKey(api.apiKey),
    })

    const info = await client.accountInfo()
    if (!info.success) {
      return apiError(info.message || 'Failed to fetch supplier account info', 502)
    }

    const creditRaw = info.credit ?? '0'
    const creditNum = Number(String(creditRaw).replace(/[^0-9.-]/g, ''))
    const lowBalance = !Number.isFinite(creditNum) || creditNum <= 0

    return apiSuccess({
      apiId: id,
      apiTitle: api.title,
      host: api.host,
      username: api.username,
      credit: creditRaw,
      creditNumeric: Number.isFinite(creditNum) ? creditNum : null,
      lowBalance,
      hint: lowBalance
        ? 'Reseller API balance is empty or zero. Top up in the supplier panel — even when the service price is $0, Dhru may still reject placeimeiorder (CreditprocessError).'
        : 'API balance is available. If orders still fail, verify the IMEI/SN is valid or check service limits.',
    })
  } catch (e) {
    console.error('[ADMIN_IMEI_API_ACCOUNT]', e)
    return apiError('Failed to check supplier API balance', 500)
  }
}
