export type MaintenanceTemplateId = 'aurora' | 'grid' | 'orbit' | 'minimal';

export type MaintenanceViewProps = {
  siteName: string;
  title: string;
  message: string;
  /** ISO string or null. When set, a countdown is shown. */
  endsAt: string | null;
};

export const MAINTENANCE_TEMPLATES: Array<{
  id: MaintenanceTemplateId;
  label: string;
  description: string;
  tone: 'dark' | 'light';
}> = [
  { id: 'aurora', label: 'Aurora', description: 'Dark · floating gradient orbs, glassmorphism', tone: 'dark' },
  { id: 'grid', label: 'Grid', description: 'Light · editorial, drifting blueprint grid + gears', tone: 'light' },
  { id: 'orbit', label: 'Orbit', description: 'Dark · sci-fi orbiting particles around a core', tone: 'dark' },
  { id: 'minimal', label: 'Minimal', description: 'Light · clean typographic, subtle progress bar', tone: 'light' },
];
