import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { getSharedPool } from '@solaros/db';
import { SubscriptionClient } from './SubscriptionClient';

export default async function SubscriptionSettingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const { rows } = await getSharedPool().query<{
    provider: string;
    instance_id: string;
    region: string;
    provisioned_at: string;
  }>(
    `SELECT provider, instance_id, region, provisioned_at FROM managed_tenant_databases WHERE tenant_id = $1 AND is_active = true`,
    [tenant.id]
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-100">Subscription & Database Hosting</h1>
      <SubscriptionClient
        tenantSlug={tenantParam}
        currentTier={tenant.subscriptionTier}
        dbMode={tenant.dbMode}
        managedDatabase={rows[0] ?? null}
      />
    </div>
  );
}
