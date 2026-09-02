import { NextResponse } from 'next/server';
import { provisionDedicatedDatabase, getSharedPool } from '@solaros/db';
import { resolveTenantFromParam } from '@/lib/tenant';

export async function POST(request: Request) {
  const { tenantSlug } = (await request.json()) as { tenantSlug?: string };
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenantSlug is required.' }, { status: 400 });
  }

  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown tenant.' }, { status: 404 });
  }

  if (tenant.subscriptionTier !== 'enterprise_dedicated') {
    return NextResponse.json(
      { error: 'Tenant must upgrade to the Enterprise Dedicated plan before provisioning a dedicated database.' },
      { status: 409 }
    );
  }

  try {
    const result = await provisionDedicatedDatabase(tenant.id, tenant.slug);
    return NextResponse.json({ provisioned: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get('tenantSlug');
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenantSlug is required.' }, { status: 400 });
  }

  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown tenant.' }, { status: 404 });
  }

  const { rows } = await getSharedPool().query(
    `SELECT provider, instance_id, region, is_active, last_migration_version, provisioned_at
       FROM managed_tenant_databases WHERE tenant_id = $1`,
    [tenant.id]
  );

  return NextResponse.json({ dbMode: tenant.dbMode, managedDatabase: rows[0] ?? null });
}
