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
  // Next's own file-tracing — for *both* Vercel's native serverless bundling
  // and this app's own standalone step above — misses next/dist/compiled/
  // source-map in this Next.js version on a pnpm monorepo: confirmed as a
  // Vercel runtime crash ("Cannot find module ... Did you forget to add it
  // to dependencies") that persisted even after ruling out standalone mode
  // entirely as the cause (same error, from Vercel's own non-standalone
  // build, once that was confirmed via its build log to not be running the
  // standalone path at all). It's used internally by Next's own compiled
  // server for stack-trace source mapping, reached only through a
  // runtime-computed require() the trace's static analysis doesn't follow —
  // the same category of gap as react-dom's and @swc/helpers' in
  // copy-standalone-assets.mjs, just inside Next's own tracer this time
  // rather than ours. Force it into every route's trace explicitly.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/next/dist/compiled/source-map/**'],
  },
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
