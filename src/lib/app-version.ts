import packageJson from '../../package.json';

/** Installed app version from package.json (same as System & update page). */
export const APP_VERSION = packageJson.version ?? '0.1.0';

export function formatAppVersion(version: string = APP_VERSION): string {
  return version.startsWith('v') ? version : `v${version}`;
}

/** Parse semver tag from NEXUS_IMAGE (e.g. ghcr.io/org/nexus-server:0.1.19 → 0.1.19). */
export function versionFromNexusImage(imageRef?: string): string | null {
  const raw = (imageRef ?? process.env.NEXUS_IMAGE ?? '').trim();
  if (!raw) return null;
  const tag = raw.includes(':') ? raw.split(':').pop()!.trim() : raw;
  if (!tag || tag === 'latest') return null;
  return tag.replace(/^v/i, '');
}

/**
 * Reported installed version. In Docker deploys, NEXUS_IMAGE tag wins over package.json
 * so UI/history stay aligned with the running image even if package.json was not bumped at build.
 */
export function getAppVersion(): string {
  const fromImage = versionFromNexusImage();
  if (fromImage) return fromImage;
  return APP_VERSION;
}
