export { LiveOrderTicket } from '../LiveOrderTicket';
export { ConsoleLog } from './ConsoleLog';
export { StatsDashboard } from './StatsDashboard';
export { PhoneUnlock } from './PhoneUnlock';

export type HeroVisualVariant =
  | 'ticket'
  | 'console'
  | 'dashboard'
  | 'phone';

export const HERO_VISUAL_VARIANTS: Array<{
  id: HeroVisualVariant;
  label: string;
  description: string;
}> = [
  {
    id: 'ticket',
    label: 'Order ticket',
    description: 'Editorial paper docket with timeline, device ID scan, and result code reveal.',
  },
  {
    id: 'console',
    label: 'Live console',
    description: 'Dark terminal streaming real API calls and responses, typing animation.',
  },
  {
    id: 'dashboard',
    label: 'Stats dashboard',
    description: 'Floating KPI cards with counters, success ring, recent activity grid.',
  },
  {
    id: 'phone',
    label: 'Phone unlock',
    description: 'Animated phone mockup scanning device ID, transitioning lock → unlock.',
  },
];
