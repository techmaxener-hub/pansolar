import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { GlassBadge, GlassCard, GlassTable } from '@solaros/ui';

interface ProjectRow {
  customer_name: string;
  site_address: string;
  system_size_kw: string;
  estimated_cost_inr: string;
  subsidy_amount_inr: string;
  net_cost_inr: string;
  stage: string;
}

interface BomLineRow {
  description: string;
  quantity: string;
  unit: string;
  unit_price_inr: string;
  line_total_inr: string;
}

export default async function QuotePage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant: tenantParam, id } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const { project, bom } = await withTenant(tenant.id, async (client) => {
    const projectRes = await client.query<ProjectRow>(
      `SELECT customer_name, site_address, system_size_kw, estimated_cost_inr, subsidy_amount_inr, net_cost_inr, stage
         FROM solar_projects WHERE id = $1 AND tenant_id = $2`,
      [id, tenant.id]
    );
    const bomRes = await client.query<BomLineRow>(
      `SELECT description, quantity, unit, unit_price_inr, line_total_inr FROM project_bom_lines WHERE project_id = $1`,
      [id]
    );
    return { project: projectRes.rows[0], bom: bomRes.rows };
  });

  if (!project) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <GlassCard glow="emerald">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">Your Solar Quote</h1>
          <GlassBadge tone="emerald">{project.stage.replace(/_/g, ' ')}</GlassBadge>
        </div>
        <p className="mt-1 text-slate-400">
          {project.customer_name} · {project.site_address}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="System size" value={`${project.system_size_kw} kW`} />
          <Stat label="Est. cost" value={`₹${Number(project.estimated_cost_inr).toLocaleString('en-IN')}`} />
          <Stat label="Subsidy" value={`₹${Number(project.subsidy_amount_inr).toLocaleString('en-IN')}`} />
          <Stat label="Net cost" value={`₹${Number(project.net_cost_inr).toLocaleString('en-IN')}`} />
        </div>
      </GlassCard>

      <GlassTable
        rowKey={(r) => r.description}
        columns={[
          { key: 'item', header: 'Item', render: (r) => r.description },
          { key: 'qty', header: 'Qty', align: 'right', render: (r) => `${r.quantity} ${r.unit}` },
          { key: 'total', header: 'Total', align: 'right', render: (r) => `₹${Number(r.line_total_inr).toLocaleString('en-IN')}` },
        ]}
        rows={bom}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="font-semibold text-slate-100">{value}</p>
    </div>
  );
}
