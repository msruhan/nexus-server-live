/**
 * One-shot license activation from BOOTSTRAP_LICENSE_KEY (Hermes white-glove install).
 * Fire-and-forget on startup — does not block the app.
 */
import { prisma } from '@/lib/db';
import { activateLicense } from '@/lib/license/client';

let bootstrapStarted = false;

export function startLicenseBootstrap(): void {
  const key = process.env.BOOTSTRAP_LICENSE_KEY?.trim();
  if (!key || bootstrapStarted) return;
  bootstrapStarted = true;

  setTimeout(() => {
    void runBootstrap(key);
  }, 5_000);
}

async function runBootstrap(key: string): Promise<void> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { licenseKey: true, licenseStatus: true },
    });

    if (settings?.licenseKey || settings?.licenseStatus !== 'not_activated') {
      return;
    }

    const result = await activateLicense(key);
    if (result.ok) {
      console.log('[license] bootstrap: activated from BOOTSTRAP_LICENSE_KEY');
    } else {
      console.warn('[license] bootstrap failed:', result.error);
    }
  } catch (e) {
    console.warn(
      '[license] bootstrap error:',
      e instanceof Error ? e.message : e,
    );
  }
}
