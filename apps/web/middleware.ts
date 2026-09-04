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
  // See next.config.mjs's experimental.nodeMiddleware — Edge's bundling
  // pulled something DB-adjacent into this file's shared chunk despite
  // this file never importing it, crashing every matched request. Node.js
  // Middleware runs this in the same runtime as every other route instead.
  runtime: 'nodejs',
};
