/**
 * User-facing messages for Dhru Fusion supplier connection/sync failures.
 */

const IP_WHITELIST_MESSAGE =
  "Your server's public IP must be whitelisted by the supplier before API calls work. " +
  'Contact the provider (hosting / Imunify360 / firewall) with your deployment IP, then try again.';

const HOST_URL_MESSAGE =
  'Could not reach the Dhru API on this host. Verify the host URL — many panels use a /dhru path ' +
  '(e.g. https://example.com/dhru) — then run Test connection again.';

function matchesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/** Map raw supplier/API errors to clear English guidance for admins. */
export function formatDhruSupplierUserMessage(raw: string): string {
  const msg = raw.trim()
  if (!msg) return 'Supplier connection failed. Check host, username, and API key.'

  const lower = msg.toLowerCase()

  if (
    matchesAny(lower, [
      'imunify',
      'bot protection',
      'bot-protection',
      'whitelist',
      'humans_',
      'automation should be whitelisted',
      '415 unsupported',
      'returned 415',
      'unsupported media type',
      'access denied',
    ])
  ) {
    return IP_WHITELIST_MESSAGE
  }

  if (
    matchesAny(lower, [
      'endpoint not found',
      'invalid json',
      'rest api pro is not available',
      'html',
      'could not reach',
    ])
  ) {
    return HOST_URL_MESSAGE
  }

  if (matchesAny(lower, ['authentication failed', 'invalid api key', 'api key is invalid', 'username'])) {
    return msg
  }

  return msg.replace(/^DhruFusion API returned \d+:\s*/i, 'Supplier API error: ')
}

/** Toast title when the supplier blocked the request (firewall / WAF). */
export function dhruSupplierErrorTitle(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    matchesAny(lower, [
      'imunify',
      'bot protection',
      'whitelist',
      '415',
      'unsupported media type',
      'humans_',
      'access denied',
    ])
  ) {
    return 'Supplier IP whitelist required'
  }
  return 'Connection failed'
}
