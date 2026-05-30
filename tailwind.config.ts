import type { Config } from 'tailwindcss';

// Tokens are pulled from CSS variables (RGB triplets like "10 14 31").
// This lets the admin live-swap palettes without a rebuild.
function v(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        primary: {
          50: v('primary-50'),
          100: v('primary-100'),
          200: v('primary-200'),
          300: v('primary-300'),
          400: v('primary-400'),
          500: v('primary-500'),
          600: v('primary-600'),
          700: v('primary-700'),
          800: v('primary-800'),
          900: v('primary-900'),
          950: v('primary-950'),
        },
        accent: {
          400: v('accent-400'),
          500: v('accent-500'),
          600: v('accent-600'),
        },
        amber: {
          400: v('amber-400'),
          500: v('amber-500'),
          600: v('amber-600'),
        },
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          soft: v('ink-soft'),
        },
        paper: {
          DEFAULT: v('paper'),
          50: v('paper-50'),
          100: v('paper-100'),
          200: v('paper-200'),
        },
        line: {
          DEFAULT: v('line'),
          strong: v('line-strong'),
        },
      },
      letterSpacing: {
        tightest: '-0.06em',
        tighter: '-0.04em',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(10,14,31,0.04), 0 1px 2px 0 rgba(10,14,31,0.04)',
        'card-hover': '0 12px 32px -12px rgba(10,14,31,0.12), 0 1px 2px 0 rgba(10,14,31,0.04)',
        'glow-blue': '0 12px 36px -10px rgba(var(--primary-500) / 0.45), 0 2px 8px -2px rgba(var(--primary-500) / 0.20)',
        'glow-amber': '0 0 0 3px rgba(var(--amber-400) / 0.18)',
        'inset-line': 'inset 0 -1px 0 0 rgba(10,14,31,0.06)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-dot': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        scan: {
          '0%,100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(400%)' },
        },
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        marquee: 'marquee 50s linear infinite',
        'marquee-fast': 'marquee 28s linear infinite',
        'marquee-reverse': 'marquee-reverse 40s linear infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        scan: 'scan 3s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'accordion-up': 'accordion-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
