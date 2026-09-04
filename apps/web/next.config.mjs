import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' output exists only for the Hostinger/Passenger deploy path
  // (see scripts/copy-standalone-assets.mjs), which needs a self-contained
  // server.js + node_modules bundle since that host doesn't run its own
  // Next-aware build/serve pipeline. Vercel does, natively, and forcing
  // standalone mode there actively breaks it: its own file-tracing of the
  // standalone output missed next/dist/compiled/source-map, crashing every
  // request with "Cannot find module" -- a known standalone-mode tracing
  // gap, and one Vercel's normal (non-standalone) build never hits since it
  // doesn't rely on this same trace-and-copy step at all. Vercel sets
  // VERCEL=1 in its build environment, so key off that rather than
  // maintaining two separate config files.
  output: process.env.VERCEL ? undefined : 'standalone',
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
