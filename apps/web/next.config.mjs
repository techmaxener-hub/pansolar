import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Monorepo: pin tracing to the actual repo root (two levels up) so a stray
  // lockfile somewhere above the repo on a given machine can't make Next
  // infer the wrong workspace root and corrupt the standalone output layout.
  outputFileTracingRoot: join(__dirname, '../../'),
  transpilePackages: ['@solaros/ui', '@solaros/solar-engine', '@solaros/db'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
