import { prisma } from '@/lib/db'
import { apiError, apiSuccess, requireApiAuth } from '@/lib/api-auth'
import {
  deviceFieldLabel,
  findActiveDeviceDuplicate,
  formatDuplicateWarning,
} from '@/lib/imei-order-duplicate'
import { validateImeiOrderDeviceInput } from '@/lib/imei-order-input'

export const dynamic = 'force-dynamic'

/**
 * GET /api/imei/orders/check-duplicate?serviceId=&imei=&serialNumber=
 * Preflight duplicate check before placing an order.
 */
export async function GET(req: Request) {
  const { session, error } = await requireApiAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const serviceId = searchParams.get('serviceId')?.trim()
    if (!serviceId) return apiError('serviceId is required')

    const service = await prisma.imeiService.findFirst({
      where: { id: serviceId, status: 'ACTIVE' },
      select: {
        id: true,
        apiId: true,
        title: true,
        requiresImei: true,
        requiresSn: true,
        requiresEcid: true,
      },
    })
    if (!service) return apiError('Service not found or inactive', 404)

    const deviceInput = validateImeiOrderDeviceInput(service, {
      imei: searchParams.get('imei') ?? '',
      serialNumber: searchParams.get('serialNumber') ?? searchParams.get('serialNubmer'),
      ecid: searchParams.get('ecid'),
    })
    if (deviceInput.error) return apiError(deviceInput.error)

    const duplicate = await findActiveDeviceDuplicate({
      apiId: service.apiId,
      serviceId: service.id,
      deviceKey: deviceInput.imei,
    })

    const deviceLabel = deviceFieldLabel(service.requiresImei, service.requiresSn, service.requiresEcid)
    return apiSuccess({
      duplicate: !!duplicate,
      deviceLabel,
      message: duplicate ? formatDuplicateWarning(duplicate, deviceLabel) : null,
      existing: duplicate,
    })
  } catch (e) {
    console.error('[IMEI_ORDERS_CHECK_DUPLICATE]', e)
    return apiError('Failed to check for duplicate order', 500)
  }
}
