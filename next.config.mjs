import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
