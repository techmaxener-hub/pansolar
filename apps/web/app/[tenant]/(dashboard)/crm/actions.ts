'use server';

import { revalidatePath } from 'next/cache';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';

const VALID_STAGES = [
  'lead',
  'shading_survey',
  'bom_approval',
  'net_meter_sanction',
  'material_dispatch',
  'erection_wiring',
  'testing_commissioning',
  'subsidy_disbursal',
] as const;

export async function moveProjectStage(tenantSlug: string, projectId: string, toStage: string): Promise<void> {
  if (!VALID_STAGES.includes(toStage as (typeof VALID_STAGES)[number])) {
    throw new Error(`Invalid EPC stage: ${toStage}`);
  }

  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  await withTenant(tenant.id, async (client) => {
    await client.query(`UPDATE solar_projects SET stage = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [
      toStage,
      projectId,
      tenant.id,
    ]);
    await client.query(`INSERT INTO project_milestones (project_id, stage) VALUES ($1, $2)`, [projectId, toStage]);
  });

  revalidatePath(`/${tenantSlug}/crm`);
}
