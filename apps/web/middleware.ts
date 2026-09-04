import { NextResponse, type NextRequest } from 'next/server';

const ROOT_DOMAIN = process.env.PLATFORM_ROOT_DOMAIN || 'solaros.in';
const CUSTOM_DOMAIN_MARKER = '~domain~';

/**
 * Resolves which tenant a request belongs to purely from the Host header —
 * no database access here, since middleware runs on the Edge runtime.
 * `gujarat-solar.solaros.in` becomes the `gujarat-solar` param; a custom
 * CNAME domain is passed through as `~domain~<host>` and resolved against
 * `tenants.custom_domain` inside app/[tenant]/layout.tsx, which runs in the
 * Node.js runtime and can hit the shared cluster (see lib/tenant.ts).
 */
export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host') || '';
  const host = hostHeader.split(':')[0]!.toLowerCase();

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === 'localhost') {
    return NextResponse.next();
  }

  const tenantSegment = host.endsWith(`.${ROOT_DOMAIN}`)
    ? host.slice(0, -(ROOT_DOMAIN.length + 1))
    : `${CUSTOM_DOMAIN_MARKER}${host}`;

  const url = request.nextUrl.clone();

  if (url.pathname === `/${tenantSegment}` || url.pathname.startsWith(`/${tenantSegment}/`)) {
    return NextResponse.next();
  }

  url.pathname = `/${tenantSegment}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico).*)'],
  // This file imports nothing DB-related, yet every request through its
  // matcher crashed on Vercel with a pg-connection-string parse error
  // thrown from inside a shared Edge chunk -- confirmed unrelated to this
  // file's own code by comparing against routes the matcher excludes,
  // which hit real application logic instead. Per Vercel's own
  // multi-tenant-platforms docs (vercel.com/docs/platforms/multi-tenant-
  // platforms/middleware-and-routing), `runtime: 'nodejs'` here is the
  // documented way to run middleware in the same Node.js runtime as every
  // other route instead of Edge -- no next.config.mjs change needed (an
  // earlier attempt paired this with experimental.nodeMiddleware there,
  // which Next 15.5.25 doesn't recognize and which appears to have
  // silently broken middleware registration entirely rather than helping).
  runtime: 'nodejs',
};
