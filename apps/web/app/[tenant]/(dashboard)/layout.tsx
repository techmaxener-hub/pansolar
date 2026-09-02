import type { ReactNode } from 'react';
import Link from 'next/link';
import { GlassBadge } from '@solaros/ui';
import { resolveTenantFromParam } from '@/lib/tenant';

const NAV_ITEMS = [
  { href: 'crm', label: 'EPC CRM', icon: '☀️' },
  { href: 'inventory', label: 'Inventory', icon: '📦' },
  { href: 'b2b', label: 'B2B Portal', icon: '🏢' },
  { href: 'vendor', label: 'Vendor Extranet', icon: '🚚' },
  { href: 'settings/subscription', label: 'Subscription', icon: '⚙️' },
];

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold text-slate-100">{tenant?.name ?? 'SolarOS'}</p>
          {tenant && (
            <GlassBadge tone={tenant.subscriptionTier === 'enterprise_dedicated' ? 'cyan' : 'neutral'}>
              {tenant.subscriptionTier.replace('_', ' ')}
            </GlassBadge>
          )}
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={`/${tenantParam}/${item.href}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
