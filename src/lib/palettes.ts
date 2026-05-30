// Color palette templates + utilities.
// Each token maps directly to a CSS variable in :root that the Tailwind
// config consumes via rgb(var(--token) / <alpha-value>).

export type PaletteTokens = {
  paper: string;
  'paper-50': string;
  'paper-100': string;
  'paper-200': string;
  line: string;
  'line-strong': string;
  ink: string;
  'ink-muted': string;
  'ink-soft': string;
  'primary-50': string;
  'primary-100': string;
  'primary-200': string;
  'primary-300': string;
  'primary-400': string;
  'primary-500': string;
  'primary-600': string;
  'primary-700': string;
  'primary-800': string;
  'primary-900': string;
  'primary-950': string;
  'accent-400': string;
  'accent-500': string;
  'accent-600': string;
  'amber-400': string;
  'amber-500': string;
  'amber-600': string;
};

export type PaletteTemplate = {
  id: string;
  name: string;
  description: string;
  mood: string; // short tag e.g. "Editorial · default"
  isDark?: boolean;
  // A trio used for the swatch preview
  swatchPaper: string;
  swatchInk: string;
  swatchPrimary: string;
  swatchAccent: string;
  tokens: PaletteTokens;
};

// ─── Templates ────────────────────────────────────────────────

export const PALETTE_TEMPLATES: PaletteTemplate[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Warm paper, deep navy ink, electric blue accent. The default voice.',
    mood: 'Default · cool',
    swatchPaper: '#fbfaf6',
    swatchInk: '#0a0e1f',
    swatchPrimary: '#2f63ff',
    swatchAccent: '#06b6d4',
    tokens: {
      paper: '#fbfaf6',
      'paper-50': '#ffffff',
      'paper-100': '#fafaf6',
      'paper-200': '#f4f3ed',
      line: '#e6e4dc',
      'line-strong': '#cdcabe',
      ink: '#0a0e1f',
      'ink-muted': '#5a6172',
      'ink-soft': '#8b91a3',
      'primary-50': '#eff5ff',
      'primary-100': '#dbe7ff',
      'primary-200': '#bfd3ff',
      'primary-300': '#93b4ff',
      'primary-400': '#608bff',
      'primary-500': '#2f63ff',
      'primary-600': '#1f48e6',
      'primary-700': '#1a37b8',
      'primary-800': '#1a2f93',
      'primary-900': '#1b2c75',
      'primary-950': '#0f1644',
      'accent-400': '#22d3ee',
      'accent-500': '#06b6d4',
      'accent-600': '#0891b2',
      'amber-400': '#fbbf24',
      'amber-500': '#f59e0b',
      'amber-600': '#d97706',
    },
  },
  {
    id: 'theatre',
    name: 'Theatre',
    description: 'Playbill cream, oxblood velvet, antique gold. For dramatic announcements.',
    mood: 'Editorial · warm',
    swatchPaper: '#f7f0e6',
    swatchInk: '#1a0f0a',
    swatchPrimary: '#8b1a2a',
    swatchAccent: '#c8a04e',
    tokens: {
      paper: '#f7f0e6',
      'paper-50': '#fdf9f1',
      'paper-100': '#f3e9d9',
      'paper-200': '#ebdec7',
      line: '#d6c4a3',
      'line-strong': '#b8a37e',
      ink: '#1a0f0a',
      'ink-muted': '#5c4a36',
      'ink-soft': '#8a7a64',
      'primary-50': '#fbf2f3',
      'primary-100': '#f6dcdf',
      'primary-200': '#ecbac0',
      'primary-300': '#dd8b94',
      'primary-400': '#c45a67',
      'primary-500': '#8b1a2a',
      'primary-600': '#6f1320',
      'primary-700': '#5a0e1a',
      'primary-800': '#440a14',
      'primary-900': '#33070f',
      'primary-950': '#1f0408',
      'accent-400': '#dabf6c',
      'accent-500': '#c8a04e',
      'accent-600': '#a8853a',
      'amber-400': '#d4a64d',
      'amber-500': '#b58a35',
      'amber-600': '#8e6c25',
    },
  },
  {
    id: 'earth-tone',
    name: 'Earth tone',
    description: 'Sand paper, terracotta clay, forest moss. A naturalist almanac.',
    mood: 'Editorial · warm',
    swatchPaper: '#f5eddf',
    swatchInk: '#2a1f12',
    swatchPrimary: '#b8551f',
    swatchAccent: '#5c7a3b',
    tokens: {
      paper: '#f5eddf',
      'paper-50': '#fbf6ec',
      'paper-100': '#f0e4d2',
      'paper-200': '#e6d6bd',
      line: '#d2bea4',
      'line-strong': '#b89f81',
      ink: '#2a1f12',
      'ink-muted': '#6b5a45',
      'ink-soft': '#a08e75',
      'primary-50': '#fcf2eb',
      'primary-100': '#f7dfce',
      'primary-200': '#efbf9c',
      'primary-300': '#e3996a',
      'primary-400': '#d27640',
      'primary-500': '#b8551f',
      'primary-600': '#964213',
      'primary-700': '#7a3510',
      'primary-800': '#5d290c',
      'primary-900': '#451e09',
      'primary-950': '#2a1206',
      'accent-400': '#7a9a4f',
      'accent-500': '#5c7a3b',
      'accent-600': '#445c2c',
      'amber-400': '#d4a352',
      'amber-500': '#b58335',
      'amber-600': '#8e6526',
    },
  },
  {
    id: 'festive',
    name: 'Festive',
    description: 'Ivory paper, vermilion lantern, saffron warmth. A celebratory issue.',
    mood: 'Editorial · vivid',
    swatchPaper: '#fdf5e9',
    swatchInk: '#1c0e0e',
    swatchPrimary: '#c1272d',
    swatchAccent: '#e6a82d',
    tokens: {
      paper: '#fdf5e9',
      'paper-50': '#fffaf0',
      'paper-100': '#f9ede0',
      'paper-200': '#f0dfca',
      line: '#d9c7a8',
      'line-strong': '#bca583',
      ink: '#1c0e0e',
      'ink-muted': '#5a3434',
      'ink-soft': '#8a6868',
      'primary-50': '#fdecec',
      'primary-100': '#fbd0d2',
      'primary-200': '#f6a3a6',
      'primary-300': '#ee6e74',
      'primary-400': '#dc434a',
      'primary-500': '#c1272d',
      'primary-600': '#a01e23',
      'primary-700': '#7d171b',
      'primary-800': '#5d1115',
      'primary-900': '#420c0e',
      'primary-950': '#280608',
      'accent-400': '#f0bf4a',
      'accent-500': '#e6a82d',
      'accent-600': '#bf8a1f',
      'amber-400': '#f0b840',
      'amber-500': '#cd9926',
      'amber-600': '#a3781a',
    },
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Chalk paper, deep teal, soft mist. A nautical chart room.',
    mood: 'Editorial · cool',
    swatchPaper: '#f8f5ed',
    swatchInk: '#0c1f33',
    swatchPrimary: '#18596f',
    swatchAccent: '#5d9bb0',
    tokens: {
      paper: '#f8f5ed',
      'paper-50': '#fdfbf4',
      'paper-100': '#f3eee0',
      'paper-200': '#e7e1cf',
      line: '#c8c0a8',
      'line-strong': '#a99f82',
      ink: '#0c1f33',
      'ink-muted': '#4a6378',
      'ink-soft': '#7d92a3',
      'primary-50': '#ecf5f8',
      'primary-100': '#cee5ec',
      'primary-200': '#9bccd8',
      'primary-300': '#62afbf',
      'primary-400': '#358298',
      'primary-500': '#18596f',
      'primary-600': '#114558',
      'primary-700': '#0c3543',
      'primary-800': '#082632',
      'primary-900': '#051a23',
      'primary-950': '#020e13',
      'accent-400': '#7eb3c5',
      'accent-500': '#5d9bb0',
      'accent-600': '#42808f',
      'amber-400': '#d6a35a',
      'amber-500': '#b58438',
      'amber-600': '#8e6628',
    },
  },
  {
    id: 'garden',
    name: 'Garden',
    description: 'Cream paper, deep emerald, dusty rose. A botanical print.',
    mood: 'Editorial · botanical',
    swatchPaper: '#f6f1e6',
    swatchInk: '#1f2a18',
    swatchPrimary: '#356e3f',
    swatchAccent: '#c97585',
    tokens: {
      paper: '#f6f1e6',
      'paper-50': '#fcf8ee',
      'paper-100': '#f1ebdb',
      'paper-200': '#e7dec8',
      line: '#cdc0a3',
      'line-strong': '#aea181',
      ink: '#1f2a18',
      'ink-muted': '#4f5e44',
      'ink-soft': '#8a9078',
      'primary-50': '#eef7ef',
      'primary-100': '#d2ead7',
      'primary-200': '#a4d4af',
      'primary-300': '#73b682',
      'primary-400': '#4a9159',
      'primary-500': '#356e3f',
      'primary-600': '#295431',
      'primary-700': '#1f4126',
      'primary-800': '#172f1c',
      'primary-900': '#101f13',
      'primary-950': '#08120a',
      'accent-400': '#d68f9c',
      'accent-500': '#c97585',
      'accent-600': '#a85565',
      'amber-400': '#d6a83c',
      'amber-500': '#b58823',
      'amber-600': '#8e6918',
    },
  },
  {
    id: 'twilight',
    name: 'Twilight',
    description: 'Lavender mist, plum, soft peach. After-hours correspondence.',
    mood: 'Editorial · dusk',
    swatchPaper: '#f0eaf0',
    swatchInk: '#1a1024',
    swatchPrimary: '#7a3d8f',
    swatchAccent: '#e8a172',
    tokens: {
      paper: '#f0eaf0',
      'paper-50': '#f7f2f7',
      'paper-100': '#e8dee8',
      'paper-200': '#ddd0dd',
      line: '#c0b0c0',
      'line-strong': '#9d8a9d',
      ink: '#1a1024',
      'ink-muted': '#5a4670',
      'ink-soft': '#8c7da3',
      'primary-50': '#f5edf7',
      'primary-100': '#e7d2ee',
      'primary-200': '#d0a4dc',
      'primary-300': '#b677c3',
      'primary-400': '#9650a8',
      'primary-500': '#7a3d8f',
      'primary-600': '#61306f',
      'primary-700': '#4a2456',
      'primary-800': '#341a3d',
      'primary-900': '#23112a',
      'primary-950': '#150a1a',
      'accent-400': '#eeb78a',
      'accent-500': '#e8a172',
      'accent-600': '#cd8051',
      'amber-400': '#ee9c5e',
      'amber-500': '#cf7d3e',
      'amber-600': '#a35e29',
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    description: 'Charcoal newsprint, electric yellow. High-contrast night edition.',
    mood: 'Dark · high contrast',
    isDark: true,
    swatchPaper: '#1a1612',
    swatchInk: '#f3ebd9',
    swatchPrimary: '#f0c52e',
    swatchAccent: '#e36f4a',
    tokens: {
      paper: '#1a1612',
      'paper-50': '#252018',
      'paper-100': '#221d18',
      'paper-200': '#2c2620',
      line: '#3a3328',
      'line-strong': '#56503e',
      ink: '#f3ebd9',
      'ink-muted': '#b8ad9a',
      'ink-soft': '#837a6b',
      'primary-50': '#3d320c',
      'primary-100': '#5e4d12',
      'primary-200': '#876e1c',
      'primary-300': '#a88815',
      'primary-400': '#d4a91c',
      'primary-500': '#f0c52e',
      'primary-600': '#f5d265',
      'primary-700': '#f8de8e',
      'primary-800': '#fae9b3',
      'primary-900': '#fdf3d6',
      'primary-950': '#fef9eb',
      'accent-400': '#f08362',
      'accent-500': '#e36f4a',
      'accent-600': '#bd5733',
      'amber-400': '#f5d265',
      'amber-500': '#d4a832',
      'amber-600': '#a88322',
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────

/** Convert "#rrggbb" → "R G B" string for use with rgb(var(--x) / <alpha>). */
export function hexToRgbTriplet(hex: string): string {
  const cleaned = hex.replace(/^#/, '').trim();
  const full =
    cleaned.length === 3
      ? cleaned.split('').map((c) => c + c).join('')
      : cleaned.length === 6
        ? cleaned
        : '000000';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Build CSS for the palette as inline-style content. */
export function paletteToCssVars(tokens: Partial<PaletteTokens>): string {
  const lines: string[] = [];
  for (const [name, hex] of Object.entries(tokens)) {
    if (typeof hex === 'string' && hex) {
      lines.push(`--${name}: ${hexToRgbTriplet(hex)};`);
    }
  }
  return lines.join('\n');
}

export function getTemplate(id: string | null | undefined): PaletteTemplate | null {
  return PALETTE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_PALETTE: PaletteTemplate = PALETTE_TEMPLATES[0];
