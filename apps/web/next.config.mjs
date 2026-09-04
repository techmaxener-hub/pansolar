import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' output exists only for the Hostinger/Passenger deploy path
  // (see scripts/copy-standalone-assets.mjs), which needs a self-contained
  // server.js + node_modules bundle since that host doesn't run its own
  // Next-aware build/serve pipeline. Vercel does, natively, and doesn't
  // need or want it — Vercel sets VERCEL=1 in its build environment, so key
  // off that rather than maintaining two separate config files.
  output: process.env.VERCEL ? undefined : 'standalone',
  // Pinning this to apps/web's own directory (rather than the monorepo
  // root) is what the Hostinger standalone path needs, so its output lands
  // flat at .next/standalone/server.js with no nested apps/web subfolder.
  // But per a Next.js maintainer's own diagnosis of this exact symptom
  // (vercel/next.js#83248, closed 2026-09-03): pointing outputFileTracingRoot
  // at anything other than the true monorepo root excludes some of Next's
  // own runtime files — next/dist/compiled/source-map among them — from
  // the production trace, which is exactly the "Cannot find module
  // next/dist/compiled/source-map" crash this caused on every Vercel
  // request once confirmed (via its build log) to have nothing to do with
  // standalone mode itself. Vercel's own build already knows the monorepo
  // root from its Root Directory project setting, so leave this unset
  // there and only pin it for the Hostinger path that actually needs it.
  outputFileTracingRoot: process.env.VERCEL ? undefined : __dirname,
  transpilePackages: ['@solaros/ui', '@solaros/solar-engine', '@solaros/db'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
