/** Default white-label name when SiteSettings.siteName is empty. */
export const DEFAULT_SITE_NAME = 'Recovero';

/** Fixed vendor watermark — not replaced by tenant Site Name. */
export const POWERED_BY_RECOVERO = 'Powered by Recovero';

export function resolveSiteName(name?: string | null): string {
  return name?.trim() || DEFAULT_SITE_NAME;
}
