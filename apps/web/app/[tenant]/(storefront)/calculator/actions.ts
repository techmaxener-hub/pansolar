'use server';

import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import type { SolarSizingResult } from '@solaros/solar-engine';

export interface BookSiteSurveyInput {
  tenantSlug: string;
  customerName: string;
  customerPhone: string;
  siteAddress: string;
  siteState: string;
  discom: string;
  monthlyBillInr: number;
  sizing: SolarSizingResult;
}

/** Creates the Lead-stage CRM project + its BOM snapshot from a calculator result — the D2C→EPC handoff. */
export async function bookSiteSurvey(input: BookSiteSurveyInput): Promise<{ projectId: string }> {
  const tenant = await resolveTenantFromParam(input.tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  const projectId = await withTenant(tenant.id, async (client) => {
    const projectRes = await client.query<{ id: string }>(
      `INSERT INTO solar_projects
         (tenant_id, customer_name, customer_phone, site_address, site_state, discom,
          monthly_bill_inr, system_size_kw, required_area_sqft, estimated_cost_inr,
          subsidy_amount_inr, net_cost_inr, stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'lead')
       RETURNING id`,
      [
        tenant.id,
        input.customerName,
        input.customerPhone,
        input.siteAddress,
        input.siteState,
        input.discom,
        input.monthlyBillInr,
        input.sizing.systemSizeKw,
        input.sizing.requiredAreaSqft,
        input.sizing.estimatedCostInr,
        input.sizing.subsidyAmountInr,
        input.sizing.netCostInr,
      ]
    );
    const id = projectRes.rows[0]!.id;

    for (const line of input.sizing.bom) {
      await client.query(
        `INSERT INTO project_bom_lines (project_id, category, description, quantity, unit, unit_price_inr, line_total_inr)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, line.category, line.description, line.quantity, line.unit, line.unitPriceInr, line.lineTotalInr]
      );
    }

    await client.query(
      `INSERT INTO project_milestones (project_id, stage, note) VALUES ($1, 'lead', 'Lead captured via D2C solar calculator')`,
      [id]
    );

    return id;
  });

  return { projectId };
}
