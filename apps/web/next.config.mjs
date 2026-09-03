import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Pin tracing to this app's own directory (not the monorepo root) so the
  // standalone output lands flat at .next/standalone/server.js with no
  // nested apps/web subfolder. @solaros/ui, @solaros/solar-engine, and
  // @solaros/db are transpiled and bundled inline (see transpilePackages
  // below), so their source outside this directory doesn't need tracing;
  // real npm dependencies (next, react, pg, @prisma/client, ...) are all
  // resolvable from this app's own node_modules regardless of tracing root.
  outputFileTracingRoot: __dirname,
  transpilePackages: ['@solaros/ui', '@solaros/solar-engine', '@solaros/db'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
