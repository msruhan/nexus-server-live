import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Security Headers ────────────────────────────────────────────
// CSP allows inline styles (palette injection in layout.tsx) and payment
// gateways (Stripe, PayPal, USDT Portal). License portal origin is baked
// in at build time from NEXUS_LICENSE_SERVER_URL.
function buildContentSecurityPolicy() {
  const licensePortalOrigin = (process.env.NEXUS_LICENSE_SERVER_URL ?? '')
    .replace(/\/$/, '')
    .trim();

  const connectSrc = [
    "'self'",
    'https://api.stripe.com',
    'https://*.paypal.com',
    'https://usdtportal.com',
  ];
  if (licensePortalOrigin.startsWith('https://')) {
    connectSrc.push(licensePortalOrigin);
  }

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://js.stripe.com https://*.paypal.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pdfkit'],
  webpack(config, { nextRuntime }) {
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        './instrumentation.node': path.join(__dirname, 'src/instrumentation.edge.ts'),
      };
    }
    return config;
  },
};

export default nextConfig;
