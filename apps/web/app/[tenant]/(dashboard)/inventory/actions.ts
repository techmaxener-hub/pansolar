'use server';

import { revalidatePath } from 'next/cache';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';

export async function inwardSerial(
  tenantSlug: string,
  input: { productId: string; warehouseId: string; serialNumber: string }
): Promise<void> {
  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  await withTenant(tenant.id, async (client) => {
    await client.query(
      `INSERT INTO serialized_stock (tenant_id, product_id, warehouse_id, serial_number, status)
       VALUES ($1,$2,$3,$4,'warehoused')`,
      [tenant.id, input.productId, input.warehouseId, input.serialNumber]
    );
  });

  revalidatePath(`/${tenantSlug}/inventory`);
}

export async function markSerialInstalled(tenantSlug: string, serialId: string, projectId: string): Promise<void> {
  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  await withTenant(tenant.id, async (client) => {
    await client.query(
      `UPDATE serialized_stock
          SET status = 'installed', project_id = $1, warranty_start = NOW(), warranty_end = NOW() + INTERVAL '10 years'
        WHERE id = $2 AND tenant_id = $3`,
      [projectId, serialId, tenant.id]
    );
  });

  revalidatePath(`/${tenantSlug}/inventory`);
}
