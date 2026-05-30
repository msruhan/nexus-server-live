import packageJson from '../../package.json';

/** Installed app version from package.json (same as System & update page). */
export const APP_VERSION = packageJson.version ?? '0.1.0';

export function formatAppVersion(version: string = APP_VERSION): string {
  return version.startsWith('v') ? version : `v${version}`;
}

export function getAppVersion(): string {
  return APP_VERSION;
}
