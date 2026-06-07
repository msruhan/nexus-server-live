/**
 * DhruFusion API Client — TypeScript port
 * Supports both Classic (form-data + XML) and Pro (REST + Bearer Token) versions.
 */

import { formatDhruSupplierUserMessage } from '@/lib/dhru-supplier-messages'
import {
  isImeiStressCredit,
  isImeiStressTimeout,
} from '@/lib/imei-stress-mock'
import {
  isServerStressCredit,
  isServerStressTimeout,
} from '@/lib/server-stress-mock'
import { isStressTestMode, mockDelay } from './stress-mode'

interface DhruFusionConfig {
  host: string
  username: string
  apiKey: string
}

function buildClassicApiUrls(host: string): string[] {
  const cleaned = host.replace(/\/+$/, '')
  const urls = new Set<string>([
    `${cleaned}/api/index.php`,
    `${cleaned}/index.php`,
  ])

  try {
    const parsed = new URL(cleaned)
    const origin = parsed.origin.replace(/\/+$/, '')
    urls.add(`${origin}/api/index.php`)
    urls.add(`${origin}/index.php`)
    if (!parsed.pathname.toLowerCase().includes('/dhru')) {
      urls.add(`${origin}/dhru/api/index.php`)
      urls.add(`${origin}/dhru/index.php`)
    }
  } catch {
    // Host already validated on create/update; keep conservative fallback.
  }

  return [...urls]
}

/** Dhru Classic keys are dashed segments (e.g. VQL-CBG-UIO-…); Pro uses Bearer tokens. */
export function isClassicDhruApiKey(apiKey: string): boolean {
  return /^[A-Z0-9]{3}(-[A-Z0-9]{3}){4,}$/i.test(apiKey.trim())
}

export function isDhruProSkippedOrUnavailable(error?: string): boolean {
  if (!error) return true
  return (
    error.includes('REST API Pro is not available') ||
    error.includes('Skipped — Classic API key format')
  )
}

const DHRU_CLASSIC_USER_AGENT = 'Recovero-NexusServer/1.0 (DhruFusion Classic API)'
const DHRU_BROWSER_USER_AGENT =
  'Mozilla/5.0 (compatible; NexusServer/1.0; DhruFusion Classic API) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function resolveSiteOrigin(host: string): string {
  try {
    const parsed = new URL(host.includes('://') ? host : `https://${host}`)
    return parsed.origin
  } catch {
    return host.replace(/\/+$/, '')
  }
}

/** Some panels (e.g. luteam.store) return 409 + JS cookie challenge before API access. */
function parseBotCookieChallenge(body: string): string | null {
  const m = body.match(/document\.cookie\s*=\s*["']([^"']+)["']/i)
  return m?.[1]?.trim() || null
}

function isBotCookieChallenge(status: number, body: string): boolean {
  return status === 409 && parseBotCookieChallenge(body) !== null
}

function isUnsupportedMediaType(status: number, body: string): boolean {
  return status === 415 || /415 Unsupported Media Type/i.test(body)
}

/** Imunify360 and similar WAF JSON denials (HTTP 200 with { message: "Access denied…" }). */
function parseSupplierWafDenial(body: string): string | null {
  const trimmed = body.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const json = JSON.parse(trimmed) as { message?: string; SUCCESS?: unknown; ERROR?: unknown }
    if (json.SUCCESS || json.ERROR) return null
    const msg = String(json.message ?? '').trim()
    if (!msg) return null
    if (/imunify|bot.protection|access denied|whitelist|automation/i.test(msg)) return msg
    return null
  } catch {
    return null
  }
}

function formatWafDenialError(_message: string): string {
  return formatDhruSupplierUserMessage(_message)
}

type ClassicPostOptions = {
  cookie?: string
  siteOrigin?: string
  browserLike?: boolean
}

async function postClassicForm(
  url: string,
  formData: URLSearchParams,
  options: ClassicPostOptions = {},
): Promise<{ response: Response; text: string }> {
  const { cookie, siteOrigin, browserLike = false } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': browserLike ? DHRU_BROWSER_USER_AGENT : DHRU_CLASSIC_USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  }
  if (browserLike && siteOrigin) {
    headers.Origin = siteOrigin
    headers.Referer = `${siteOrigin}/`
  }
  if (cookie) headers.Cookie = cookie

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData.toString(),
    signal: AbortSignal.timeout(60000),
  })
  const text = await response.text()
  return { response, text }
}

async function postClassicWithBypass(
  url: string,
  formData: URLSearchParams,
  siteOrigin: string,
): Promise<{ response: Response; text: string; lastError?: string }> {
  let { response, text } = await postClassicForm(url, formData, { siteOrigin })

  if (isUnsupportedMediaType(response.status, text)) {
    ;({ response, text } = await postClassicForm(url, formData, { siteOrigin, browserLike: true }))
  }

  if (isBotCookieChallenge(response.status, text)) {
    const cookie = parseBotCookieChallenge(text)!
    ;({ response, text } = await postClassicForm(url, formData, {
      siteOrigin,
      browserLike: true,
      cookie,
    }))
  }

  const waf = parseSupplierWafDenial(text)
  if (waf) {
    return { response, text, lastError: formatWafDenialError(waf) }
  }

  if (isBotCookieChallenge(response.status, text)) {
    return {
      response,
      text,
      lastError: formatDhruSupplierUserMessage(
        'Supplier blocked the API request (bot protection cookie). Whitelist your server IP.',
      ),
    }
  }

  return { response, text }
}

// ============================================================
// DhruFusion Pro (New REST API) — /api/reseller/v1/*
// ============================================================

export interface DhruProProduct {
  uuid: string
  name: string
  type: string
  cids: string[]
  price: number
  fields: DhruProField[]
}

export interface DhruProField {
  type: string
  name: string
  min?: number
  max?: number
  required?: boolean
  [key: string]: unknown
}

export interface DhruProCategory {
  id: string
  name: string
}

export interface DhruProProductsResponse {
  currency: string
  categories: Record<string, { name: string }>
  products: Record<string, DhruProProduct>
}

export class DhruFusionProClient {
  private host: string
  private bearerToken: string

  constructor(config: DhruFusionConfig) {
    // In Pro version, apiKey is the Bearer token
    this.host = config.host.replace(/\/+$/, '')
    this.bearerToken = config.apiKey
  }

  private async request<T>(endpoint: string, method = 'GET', body?: unknown): Promise<{ success: boolean; data?: T; error?: string; code?: number }> {
    if (isStressTestMode()) {
      await mockDelay(200)
      return {
        success: true,
        data: {} as T,
      }
    }
    try {
      const url = `${this.host}/api/reseller/v1${endpoint}`
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.bearerToken}`,
      }
      if (method === 'POST' || method === 'PUT') {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      })

      const text = await response.text()
      const trimmed = text.trimStart()
      if (
        response.status === 403 ||
        response.status === 404 ||
        trimmed.startsWith('<!') ||
        trimmed.startsWith('<html')
      ) {
        return {
          success: false,
          error: 'REST API Pro is not available on this host (use Classic API)',
          code: response.status,
        }
      }

      let json: Record<string, unknown>
      try {
        json = JSON.parse(text)
      } catch {
        return {
          success: false,
          error: 'REST API Pro is not available on this host (use Classic API)',
          code: response.status,
        }
      }

      if (json.status === 'success' || response.ok) {
        return { success: true, data: json as T, code: response.status }
      }
      return { success: false, error: (json.message as string) || `HTTP ${response.status}`, code: response.status }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Request failed' }
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo() {
    return this.request<{ status: string; data: { currency: string; balance: string; name: string; email: string } }>('/account')
  }

  /**
   * Get all products (both IMEI and Server — unified in Pro)
   */
  async getProducts(): Promise<{
    success: boolean
    currency?: string
    categories?: DhruProCategory[]
    products?: DhruProProduct[]
    error?: string
  }> {
    const result = await this.request<{ status: string; code: number; data: DhruProProductsResponse }>('/products')

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch products' }
    }

    const data = result.data.data
    const categories = Object.entries(data.categories || {}).map(([id, cat]) => ({
      id,
      name: cat.name,
    }))

    const products = Object.entries(data.products || {}).map(([uuid, prod]) => ({
      ...prod,
      uuid,
    }))

    return {
      success: true,
      currency: data.currency,
      categories,
      products,
    }
  }

  /**
   * Place order(s)
   */
  async placeOrder(orders: Array<{ product_uuid: string; fields: Array<Record<string, unknown>> }>): Promise<{
    success: boolean
    data?: Array<{ order_uuid: string; amount: number; currency_code: string; reference_id: string }>
    error?: string
  }> {
    const result = await this.request<{ status: string; message: string; data: Array<{ order_uuid: string; amount: number; currency_code: string; reference_id: string }> }>('/order', 'POST', orders)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Order failed' }
    }
    return { success: true, data: result.data.data }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderUuid: string): Promise<{
    success: boolean
    status?: string
    quantity?: number
    date?: string
    error?: string
  }> {
    const result = await this.request<{ status: string; data: { status: string; quantity: number; date: string } }>(`/order/${orderUuid}`)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Not found' }
    }
    return { success: true, status: result.data.data.status, quantity: result.data.data.quantity, date: result.data.data.date }
  }
}

// ============================================================
// DhruFusion Classic (Legacy form-data + XML API)
// ============================================================

interface DhruServiceItem {
  SERVICEID: string
  SERVICENAME: string
  SERVICETYPE?: string
  CREDIT: string
  TIME: string
  INFO?: string
  'Requires.Network'?: string
  'Requires.Mobile'?: string
  'Requires.Provider'?: string
  'Requires.PIN'?: string
  'Requires.KBH'?: string
  'Requires.MEP'?: string
  'Requires.PRD'?: string
  'Requires.SN'?: string
  [key: string]: string | unknown
}

interface DhruServiceGroup {
  GROUPNAME: string
  GROUPTYPE?: string
  SERVICES: Record<string, DhruServiceItem>
}

/** Dhru Fusion v6.1: server/remote/file share `imeiservicelist`; type is in SERVICETYPE / GROUPTYPE. */
const SERVER_TYPE_KEYWORDS = ['SERVER', 'REMOTE', 'FILE', 'TOOL', 'TOOLS'] as const

function normalizeDhruType(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function serviceTypeTokens(svc: DhruServiceItem, group: DhruServiceGroup): string[] {
  const tokens = [normalizeDhruType(svc.SERVICETYPE), normalizeDhruType(group.GROUPTYPE)].filter(Boolean)
  return [...new Set(tokens)]
}

function matchesServerType(token: string): boolean {
  if (SERVER_TYPE_KEYWORDS.includes(token as (typeof SERVER_TYPE_KEYWORDS)[number])) return true
  return (
    token.includes('SERVER') ||
    token.includes('REMOTE') ||
    token.includes('FILE') ||
    token === 'TOOL' ||
    token === 'TOOLS'
  )
}

/** True when service is Server / Remote / File per Dhru v6.1 grouped list. */
export function isClassicServerService(svc: DhruServiceItem, group: DhruServiceGroup): boolean {
  const tokens = serviceTypeTokens(svc, group)
  if (tokens.length === 0) return false
  return tokens.some(matchesServerType)
}

/** IMEI sync: exclude explicit server types; untyped entries stay IMEI (legacy panels). */
export function isClassicImeiService(svc: DhruServiceItem, group: DhruServiceGroup): boolean {
  return !isClassicServerService(svc, group)
}

/** Payload shape varies by `action` (accountinfo, imeiservicelist, placeimeiorder, …). */
interface DhruSuccessPayload {
  MESSAGE?: string
  LIST?: Record<string, DhruServiceGroup>
  /** Dhru API field name (misspelled "Account"). */
  AccoutInfo?: Record<string, string>
  REFERENCEID?: string | number
  STATUS?: string | number
  CODE?: string
  COMMENTS?: string
  [key: string]: unknown
}

interface DhruSuccessResponse {
  SUCCESS: DhruSuccessPayload[]
  apiversion?: string
}

interface DhruErrorResponse {
  ERROR: Array<{ MESSAGE: string }>
}

type DhruResponse = DhruSuccessResponse | DhruErrorResponse

export interface ParsedImeiService {
  toolId: string
  title: string
  groupName: string
  price: number
  deliveryTime: string
  requiresNetwork: boolean
  requiresModel: boolean
  requiresProvider: boolean
  requiresPin: boolean
  requiresKbh: boolean
  requiresMep: boolean
  requiresPrd: boolean
  requiresSn: boolean
  requiresEcid: boolean
}

export interface ParsedServerService {
  toolId: string
  title: string
  groupName: string
  price: number
  deliveryTime: string
  requiredFields: string
}

function collectRequiredFieldNames(svc: DhruServiceItem): string[] {
  const required: string[] = []
  const seen = new Set<string>()

  const add = (name: string) => {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    required.push(key)
  }

  for (const [key, val] of Object.entries(svc)) {
    if (key.startsWith('Requires.') && val === 'Required') {
      add(key.replace('Requires.', ''))
    }
  }

  const custom = svc['Requires.Custom']
  if (Array.isArray(custom)) {
    for (const field of custom) {
      if (field && typeof field === 'object' && 'fieldname' in field) {
        const name = String((field as { fieldname?: string }).fieldname || '').trim()
        if (name) add(name)
      }
    }
  }

  const minQnt = parseInt(String(svc.MINQNT ?? svc['Min.Qnt'] ?? ''), 10)
  const maxQnt = parseInt(String(svc.MAXQNT ?? svc['Max.Qnt'] ?? ''), 10)
  if (minQnt > 1 || maxQnt > 0) {
    add('qnt')
  }

  return required
}

/** Dhru Classic LIST uses grouped SERVICES — same shape for IMEI and server (v6.1). */
function parseGroupedListToServerServices(
  list: Record<string, DhruServiceGroup>,
  filter?: (svc: DhruServiceItem, group: DhruServiceGroup) => boolean,
): ParsedServerService[] {
  const services: ParsedServerService[] = []

  for (const [groupKey, group] of Object.entries(list)) {
    const groupName = group.GROUPNAME || groupKey
    if (!group.SERVICES) continue

    for (const [serviceId, svc] of Object.entries(group.SERVICES)) {
      if (filter && !filter(svc, group)) continue

      const required = collectRequiredFieldNames(svc)

      services.push({
        toolId: String(svc.SERVICEID || serviceId),
        title: svc.SERVICENAME || `Service ${serviceId}`,
        groupName,
        price: parseFloat(String(svc.CREDIT)) || 0,
        deliveryTime: svc.TIME || '',
        requiredFields: required.length > 0 ? JSON.stringify(required) : String(svc.INFO || ''),
      })
    }
  }

  return services
}

function parseGroupedListToImeiServices(
  list: Record<string, DhruServiceGroup>,
): ParsedImeiService[] {
  const services: ParsedImeiService[] = []

  for (const [groupKey, group] of Object.entries(list)) {
    const groupName = group.GROUPNAME || groupKey
    if (!group.SERVICES) continue

    for (const [serviceId, svc] of Object.entries(group.SERVICES)) {
      if (!isClassicImeiService(svc, group)) continue

      services.push({
        toolId: String(svc.SERVICEID || serviceId),
        title: svc.SERVICENAME || `Service ${serviceId}`,
        groupName,
        price: parseFloat(String(svc.CREDIT)) || 0,
        deliveryTime: svc.TIME || '',
        requiresNetwork: svc['Requires.Network'] === 'Required',
        requiresModel: svc['Requires.Mobile'] === 'Required',
        requiresProvider: svc['Requires.Provider'] === 'Required',
        requiresPin: svc['Requires.PIN'] === 'Required',
        requiresKbh: svc['Requires.KBH'] === 'Required',
        requiresMep: svc['Requires.MEP'] === 'Required',
        requiresPrd: svc['Requires.PRD'] === 'Required',
        requiresSn: svc['Requires.SN'] === 'Required',
        requiresEcid: svc['Requires.ECID'] === 'Required',
      })
    }
  }

  return services
}

function encodeDhruCustomField(fields: Record<string, string>): string {
  return Buffer.from(JSON.stringify(fields), 'utf8').toString('base64')
}

function dhruErrorMessage(res: DhruResponse): string {
  return 'ERROR' in res ? String(res.ERROR[0]?.MESSAGE || '').trim() : ''
}

function isDhruLegacyActionUnavailable(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('command not found') ||
    m.includes('invalid action') ||
    m.includes('unknown action')
  )
}

function isDhruImeiFieldRequiredError(msg: string): boolean {
  const m = msg.toLowerCase()
  return m.includes('imei') && m.includes('required')
}

/** Dhru Fusion Pro product UUID (toolId from Pro /products sync). */
export function isDhruProProductId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim(),
  )
}

/** Supplier rejected the service/product id (Classic ID vs SERVICE_ID vs Pro uuid). */
export function isDhruInvalidServiceIdError(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    (m.includes('id') && m.includes('invalid')) ||
    m.includes('invalid service') ||
    m.includes('service not found') ||
    m.includes('product not found') ||
    m.includes('product_uuid')
  )
}

/** Map Pro REST order status string to Classic numeric STATUS for shared mappers. */
export function mapProOrderStatusToDhruNumber(status: string | undefined): number {
  const s = (status ?? '').toLowerCase()
  if (s.includes('success') || s.includes('complete')) return 4
  if (s.includes('reject') || s.includes('fail') || s.includes('cancel')) return 3
  if (s.includes('process') || s.includes('pending') || s.includes('queue')) return 1
  return 0
}

function extractDhruPlaceReference(row: Record<string, unknown> | undefined): string {
  if (!row) return ''
  const ref = row.REFERENCEID ?? row.referenceid ?? row.ID ?? row.id
  return String(ref ?? '').trim()
}

function mapClassicServerStatusString(status: string): number {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('success')) return 4
  if (s.includes('reject') || s.includes('fail') || s.includes('cancel')) return 3
  if (s.includes('process') || s.includes('pending')) return 1
  return 0
}

function withDhruQuantity(
  params: Record<string, string>,
  quantity?: string,
): Record<string, string> {
  if (!quantity) return params
  return { ...params, QNT: quantity }
}

export function isServerProProduct(product: DhruProProduct): boolean {
  const type = (product.type || '').toLowerCase()
  if (!type) return false
  return (
    type.includes('server') ||
    type.includes('remote') ||
    type.includes('file') ||
    type === 'tool' ||
    type === 'tools'
  )
}

export function isImeiProProduct(product: DhruProProduct): boolean {
  return !isServerProProduct(product)
}

export function resolveProCategoryName(
  categories: DhruProCategory[] | undefined,
  product: DhruProProduct,
): string {
  const cids = Array.isArray(product.cids) ? product.cids : []
  return categories?.find((c) => cids.includes(c.id))?.name || 'Uncategorized'
}

/** User-facing message when supplier has no server/file services on the account. */
export function formatServerSyncError(classicError: string, proError?: string): string {
  const lower = classicError.toLowerCase()

  if (
    lower.includes('command not found') ||
    lower.includes('no file service') ||
    lower.includes('not active') ||
    lower.includes('tidak ada service') ||
    lower.includes('kosong') ||
    lower.includes('tidak ada layanan server') ||
    lower.includes('servicetype server')
  ) {
    return 'This supplier account has no active Server/Remote/File services in imeiservicelist. Use Sync IMEI Services — your credentials are valid for IMEI services only.'
  }

  const proUnavailable =
    !proError ||
    proError.includes('REST API Pro is not available') ||
    proError.includes('Invalid JSON') ||
    proError.includes('Skipped — Classic API key format')

  if (proUnavailable) {
    return formatDhruSupplierUserMessage(classicError)
  }

  return formatDhruSupplierUserMessage(`${classicError} (Pro API: ${proError})`)
}

export class DhruFusionClient {
  private host: string
  private username: string
  private apiKey: string

  constructor(config: DhruFusionConfig) {
    this.host = config.host.replace(/\/+$/, '') // remove trailing slash
    this.username = config.username
    this.apiKey = config.apiKey
  }

  /**
   * Execute an action against the DhruFusion API.
   */
  private async request(action: string, parameters?: Record<string, string>): Promise<DhruResponse> {
    if (isStressTestMode()) {
      await mockDelay(200)
      return {
        SUCCESS: [
          {
            REFERENCEID: `stress-${Date.now()}`,
            STATUS: 'Pending',
            CODE: 'OK',
            COMMENTS: 'Stress test mock response',
          },
        ],
      }
    }
    let xmlParams = ''
    if (parameters && Object.keys(parameters).length > 0) {
      const entries = Object.entries(parameters)
        .map(([k, v]) => `<${k.toUpperCase()}>${v}</${k.toUpperCase()}>`)
        .join('')
      xmlParams = `<PARAMETERS>${entries}</PARAMETERS>`
    }

    const formData = new URLSearchParams()
    formData.set('username', this.username)
    formData.set('apiaccesskey', this.apiKey)
    formData.set('action', action)
    formData.set('requestformat', 'JSON')
    formData.set('parameters', xmlParams)

    const classicUrls = buildClassicApiUrls(this.host)
    const siteOrigin = resolveSiteOrigin(this.host)
    let lastError = 'DhruFusion API endpoint not found'

    for (const url of classicUrls) {
      try {
        const { response, text, lastError: wafError } = await postClassicWithBypass(
          url,
          formData,
          siteOrigin,
        )

        if (wafError) {
          lastError = wafError
          continue
        }

        if (!response.ok) {
          lastError = `DhruFusion API returned ${response.status}: ${response.statusText}`
          continue
        }

        try {
          return JSON.parse(text) as DhruResponse
        } catch {
          lastError = `DhruFusion API returned invalid JSON: ${text.slice(0, 200)}`
          continue
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Request failed'
      }
    }

    throw new Error(formatDhruSupplierUserMessage(lastError))
  }

  /**
   * Test connection / get account info.
   */
  async accountInfo(): Promise<{ success: boolean; message?: string; credit?: string }> {
    try {
      const res = await this.request('accountinfo')
      if ('ERROR' in res) {
        const raw = res.ERROR[0]?.MESSAGE || 'Unknown error'
        return { success: false, message: formatDhruSupplierUserMessage(raw) }
      }
      const info = res.SUCCESS?.[0]?.AccoutInfo
      return { success: true, credit: info?.credit, message: 'Connected' }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Connection failed'
      return { success: false, message: formatDhruSupplierUserMessage(raw) }
    }
  }

  /**
   * Fetch grouped service list via `imeiservicelist` (Dhru v6.1 — IMEI + server share this action).
   */
  private async fetchClassicServiceList(): Promise<{
    success: boolean
    list?: Record<string, DhruServiceGroup>
    error?: string
  }> {
    try {
      const res = await this.request('imeiservicelist')

      if ('ERROR' in res) {
        const raw = res.ERROR[0]?.MESSAGE || 'Unknown error'
        return { success: false, error: formatDhruSupplierUserMessage(raw) }
      }

      const list = res.SUCCESS?.[0]?.LIST
      if (!list || Array.isArray(list) || Object.keys(list).length === 0) {
        return { success: false, error: 'Empty service list from supplier' }
      }

      return { success: true, list }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Failed to fetch services'
      return { success: false, error: formatDhruSupplierUserMessage(raw) }
    }
  }

  /**
   * Fetch IMEI service list from supplier (filters SERVICETYPE/GROUPTYPE ≠ server).
   */
  async getImeiServiceList(): Promise<{ success: boolean; services: ParsedImeiService[]; error?: string }> {
    const fetched = await this.fetchClassicServiceList()
    if (!fetched.success || !fetched.list) {
      return { success: false, services: [], error: fetched.error }
    }

    const services = parseGroupedListToImeiServices(fetched.list)
    if (services.length === 0) {
      return {
        success: false,
        services: [],
        error: 'No IMEI services in imeiservicelist (only Server/Remote/File or empty list)',
      }
    }

    return { success: true, services }
  }

  /**
   * Place an IMEI order with the supplier.
   */
  async placeOrder(serviceId: string, imei: string, extra?: Record<string, string>): Promise<{
    success: boolean
    referenceId?: string
    error?: string
  }> {
    return this.placeImeiOrderFields(serviceId, { IMEI: imei, ...extra })
  }

  /**
   * Place IMEI order (v6.1 CUSTOMFIELD base64 JSON, fallback flat IMEI params).
   */
  async placeImeiOrderFields(
    serviceId: string,
    fields: Record<string, string>,
  ): Promise<{ success: boolean; referenceId?: string; error?: string }> {
    if (isStressTestMode()) {
      await mockDelay(200)
      const imei = fields.IMEI ?? ''
      if (isImeiStressCredit(imei)) {
        return {
          success: false,
          error: 'CreditprocessError: INSUFFICIENT_CREDIT on reseller account',
        }
      }
      if (isImeiStressTimeout(imei)) {
        return { success: false, error: 'Request timeout while contacting supplier' }
      }
      return {
        success: true,
        referenceId: `stress-${Date.now()}`,
      }
    }

    try {
      let res = await this.request('placeimeiorder', {
        ID: serviceId,
        CUSTOMFIELD: encodeDhruCustomField(fields),
      })

      if ('ERROR' in res) {
        const flat: Record<string, string> = { ID: serviceId, ...fields }
        if (fields.IMEI) flat.IMEI = fields.IMEI
        res = await this.request('placeimeiorder', flat)
      }

      if ('ERROR' in res) {
        return { success: false, error: res.ERROR[0]?.MESSAGE || 'Order failed' }
      }

      const refId = res.SUCCESS?.[0]?.REFERENCEID
      return { success: true, referenceId: String(refId ?? '') }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Order failed' }
    }
  }

  /**
   * Check order status from supplier.
   */
  async getOrderStatus(orderId: string): Promise<{
    success: boolean
    status?: number
    code?: string
    comments?: string
    error?: string
  }> {
    try {
      const res = await this.request('getimeiorder', { ID: orderId })

      if ('ERROR' in res) {
        return { success: false, error: res.ERROR[0]?.MESSAGE || 'Not found' }
      }

      const data = res.SUCCESS?.[0]
      return {
        success: true,
        status: Number(data?.STATUS ?? 0),
        code: String(data?.CODE ?? ''),
        comments: String(data?.COMMENTS ?? ''),
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Check failed' }
    }
  }

  /**
   * Fetch server/remote/file services (Classic v6.1: same `imeiservicelist`, filter by SERVICETYPE).
   * Falls back to legacy `serverservicelist` / `fileservicelist` on older panels.
   */
  async getServerServiceList(): Promise<{ success: boolean; services: ParsedServerService[]; error?: string }> {
    const errors: string[] = []

    const fetched = await this.fetchClassicServiceList()
    if (fetched.success && fetched.list) {
      const fromImeiList = parseGroupedListToServerServices(fetched.list, isClassicServerService)
      if (fromImeiList.length > 0) {
        return { success: true, services: fromImeiList }
      }
      errors.push(
        'imeiservicelist: no services with SERVICETYPE/GROUPTYPE Server, Remote, or File',
      )
    } else if (fetched.error) {
      errors.push(`imeiservicelist: ${fetched.error}`)
    }

    const legacyActions = ['serverservicelist', 'fileservicelist'] as const
    for (const action of legacyActions) {
      try {
        const res = await this.request(action)

        if ('ERROR' in res) {
          errors.push(`${action}: ${res.ERROR[0]?.MESSAGE || 'Unknown error'}`)
          continue
        }

        const list = res.SUCCESS?.[0]?.LIST
        if (!list || Array.isArray(list) || Object.keys(list).length === 0) {
          errors.push(`${action}: empty service list`)
          continue
        }

        const services = parseGroupedListToServerServices(list)
        if (services.length > 0) {
          return { success: true, services }
        }

        errors.push(`${action}: no services could be parsed`)
      } catch (e) {
        errors.push(`${action}: ${e instanceof Error ? e.message : 'request failed'}`)
      }
    }

    return {
      success: false,
      services: [],
      error: errors.join(' · ') || 'No server services from supplier',
    }
  }

  /**
   * Place a server order.
   * Tries `placeserverorder` first (no IMEI gate), then v6.1 `placeimeiorder` + CUSTOMFIELD.
   */
  async placeServerOrder(
    serviceId: string,
    fields: Record<string, string>,
    options?: {
      quantity?: string
      alternateFields?: Record<string, string>
      /** Requires.Custom casing (Username, Password, …) for CUSTOMFIELD JSON. */
      customFields?: Record<string, string>
    },
  ): Promise<{
    success: boolean
    referenceId?: string
    error?: string
  }> {
    if (isStressTestMode()) {
      await mockDelay(200)
      const email = String(fields.EMAIL ?? fields.email ?? '').toLowerCase()
      if (isServerStressCredit(email)) {
        return {
          success: false,
          error: 'CreditprocessError: INSUFFICIENT_CREDIT on reseller account',
        }
      }
      if (isServerStressTimeout(email)) {
        return { success: false, error: 'Request timeout while contacting supplier' }
      }
      return {
        success: true,
        referenceId: `stress-server-${Date.now()}`,
      }
    }

    try {
      const qnt = options?.quantity
      const customFields = options?.customFields ?? {}
      const fieldVariants: Record<string, string>[] = [fields]
      if (options?.alternateFields && Object.keys(options.alternateFields).length > 0) {
        fieldVariants.push(options.alternateFields)
      }
      const attempts: Array<{ action: 'placeserverorder' | 'placeimeiorder'; params: Record<string, string> }> =
        []

      const pushServerAttempts = (idKey: 'ID' | 'SERVICE_ID', variant: Record<string, string>) => {
        attempts.push({
          action: 'placeserverorder',
          params: withDhruQuantity(
            { [idKey]: serviceId, CUSTOMFIELD: encodeDhruCustomField(variant) },
            qnt,
          ),
        })
        attempts.push({
          action: 'placeserverorder',
          params: withDhruQuantity({ [idKey]: serviceId, ...variant }, qnt),
        })
      }

      // Prefer ID + CUSTOMFIELD (Requires.Custom Title Case) — legitunlocks / luteam-style panels.
      if (Object.keys(customFields).length > 0) {
        pushServerAttempts('ID', customFields)
      }

      for (const variant of fieldVariants) {
        pushServerAttempts('ID', variant)
        pushServerAttempts('SERVICE_ID', variant)
      }

      let lastServerError = 'Order failed'
      let lastImeiError = 'Order failed'
      let sawLegacyUnavailable = false
      let sawImeiRequired = false
      let serverActionMissing = false

      for (const { action, params } of attempts) {
        const res = await this.request(action, params)
        if (!('ERROR' in res)) {
          const refId = extractDhruPlaceReference(
            res.SUCCESS?.[0] as Record<string, unknown> | undefined,
          )
          if (refId) return { success: true, referenceId: refId }
        }

        const msg = dhruErrorMessage(res) || 'Order failed'
        if (action === 'placeserverorder') {
          lastServerError = msg
          if (isDhruLegacyActionUnavailable(msg)) {
            sawLegacyUnavailable = true
            serverActionMissing = true
          }
        } else {
          lastImeiError = msg
          if (isDhruImeiFieldRequiredError(msg)) sawImeiRequired = true
        }
      }

      // placeimeiorder only when placeserverorder action is unavailable (never for invalid server ID).
      if (serverActionMissing || sawLegacyUnavailable) {
        for (const variant of fieldVariants) {
          for (const { action, params } of [
            {
              action: 'placeimeiorder' as const,
              params: withDhruQuantity(
                { ID: serviceId, CUSTOMFIELD: encodeDhruCustomField(variant) },
                qnt,
              ),
            },
            {
              action: 'placeimeiorder' as const,
              params: withDhruQuantity({ ID: serviceId, ...variant }, qnt),
            },
          ]) {
            const res = await this.request(action, params)
            if (!('ERROR' in res)) {
              const refId = extractDhruPlaceReference(
                res.SUCCESS?.[0] as Record<string, unknown> | undefined,
              )
              if (refId) return { success: true, referenceId: refId }
            }
            const msg = dhruErrorMessage(res) || 'Order failed'
            lastImeiError = msg
            if (isDhruImeiFieldRequiredError(msg) && !sawLegacyUnavailable) break
          }
        }
      }

      const preferServer =
        lastServerError !== 'Order failed' &&
        !isDhruInvalidServiceIdError(lastServerError) &&
        !lastServerError.toLowerCase().includes('imei')
      return {
        success: false,
        error: preferServer ? lastServerError : lastImeiError !== 'Order failed' ? lastImeiError : lastServerError,
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Order failed' }
    }
  }

  /**
   * Check server order status — `getserverstatus` (legacy) then `getimeiorder` (v6.1).
   */
  async getServerOrderStatus(orderId: string): Promise<{
    success: boolean
    status?: number
    code?: string
    comments?: string
    error?: string
  }> {
    try {
      const res = await this.request('getserverstatus', { ID: orderId })
      if (!('ERROR' in res)) {
        const data = res.SUCCESS?.[0] as Record<string, unknown> | undefined
        const orderStatus = String(data?.ORDER_STATUS ?? data?.STATUS ?? '')
        return {
          success: true,
          status: mapClassicServerStatusString(orderStatus),
          code: String(data?.CODE ?? data?.FILE_URL ?? ''),
          comments: String(data?.COMMENTS ?? data?.MESSAGE ?? ''),
        }
      }
    } catch {
      // fall through to getimeiorder
    }
    return this.getOrderStatus(orderId)
  }
}
