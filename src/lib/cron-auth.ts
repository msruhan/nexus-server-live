export function getCronSecrets(): string[] {
  const secrets: string[] = []
  const current = process.env.CRON_SECRET?.trim()
  const old = process.env.CRON_SECRET_OLD?.trim()
  if (current) secrets.push(current)
  if (old) secrets.push(old)
  return secrets
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization')?.trim()
  if (!auth?.toLowerCase().startsWith('bearer ')) return null
  const token = auth.slice(7).trim()
  return token || null
}

/**
 * Accept CRON_SECRET or CRON_SECRET_OLD (rotation window).
 */
export function validateCronSecret(req: Request): Response | null {
  const allowed = getCronSecrets()
  if (allowed.length === 0) {
    return Response.json(
      { success: false, error: 'CRON_SECRET is not configured on the server' },
      { status: 503 },
    )
  }

  const token = extractBearerToken(req)
  if (!token || !allowed.includes(token)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
