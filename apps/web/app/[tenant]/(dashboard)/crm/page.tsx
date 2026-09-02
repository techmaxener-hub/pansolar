import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { CrmBoard, type CrmProject } from './CrmBoard';

interface ProjectRow {
  id: string;
  stage: string;
  customer_name: string;
  system_size_kw: string;
  net_cost_inr: string;
  site_state: string;
}

export default async function CrmPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const rows = await withTenant(tenant.id, async (client) => {
    const res = await client.query<ProjectRow>(
      `SELECT id, stage, customer_name, system_size_kw, net_cost_inr, site_state
         FROM solar_projects WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenant.id]
    );
    return res.rows;
  });

  const projects: CrmProject[] = rows.map((r) => ({
    id: r.id,
    columnKey: r.stage,
    customerName: r.customer_name,
    systemSizeKw: Number(r.system_size_kw),
    netCostInr: Number(r.net_cost_inr),
    siteState: r.site_state,
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-100">EPC Project Pipeline</h1>
      <CrmBoard tenantSlug={tenantParam} initialProjects={projects} />
    </div>
  );
}
