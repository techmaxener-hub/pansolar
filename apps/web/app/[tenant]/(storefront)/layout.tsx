import type { ReactNode } from 'react';
import Link from 'next/link';
import { resolveTenantFromParam } from '@/lib/tenant';

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-white/10 py-6">
        <Link href={`/${tenantParam}`} className="flex items-center gap-3">
          {tenant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-auto" />
          ) : (
            <span
              className="text-lg font-semibold"
              style={{ color: 'var(--tenant-brand-primary)' }}
            >
              {tenant?.name ?? 'SolarOS'}
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <Link href={`/${tenantParam}/calculator`} className="hover:text-white">
            Solar Calculator
          </Link>
        </nav>
      </header>
      <main className="flex-1 py-10">{children}</main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Powered by SolarOS Enterprise
      </footer>
    </div>
  );
}
