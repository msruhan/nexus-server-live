/**
 * License & Update system types.
 */

export type LicenseStatus = 'active' | 'inactive' | 'not_activated';

export type LicenseInfo = {
  status: LicenseStatus;
  key: string | null; // masked (last 8 chars visible)
  domain: string | null;
  plan: string | null;
  expiresAt: string | null; // ISO date
  lastValidatedAt: string | null; // ISO date
  reason?: string; // if inactive, why
};

export type DeactivateLicenseResult =
  | { ok: true; remote: true }
  | { ok: true; remote: false; warning: string }
  | { ok: false; error: string };

export type UpdateInfo = {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  changelog: string | null;
  downloadSize: number | null; // bytes
  checksum: string | null;
  downloadUrl: string | null;
};

export type UpdateProgress = {
  phase: 'idle' | 'downloading' | 'extracting' | 'installing' | 'migrating' | 'building' | 'restarting' | 'done' | 'failed';
  percent: number; // 0-100
  message: string;
  error?: string;
};
