'use server';

import { revalidatePath } from 'next/cache';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { validateGstin } from '@solaros/solar-engine';

export async function createPurchaseOrder(
  tenantSlug: string,
  input: { vendorName: string; vendorGstin: string; poNumber: string; totalValueInr: number }
): Promise<void> {
  const gstinCheck = validateGstin(input.vendorGstin);
  if (!gstinCheck.valid) throw new Error(gstinCheck.reason);

  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  await withTenant(tenant.id, async (client) => {
    await client.query(
      `INSERT INTO purchase_orders (tenant_id, vendor_name, vendor_gstin, po_number, total_value_inr, status)
       VALUES ($1,$2,$3,$4,$5,'submitted')`,
      [tenant.id, input.vendorName, input.vendorGstin, input.poNumber, input.totalValueInr]
    );
  });

  revalidatePath(`/${tenantSlug}/vendor`);
}

/** Parses a one-serial-per-line (or comma-separated) CSV of module/inverter barcodes from an ASN upload. */
function parseSerialCsv(csvText: string): string[] {
  return csvText
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== 'serial_number');
}

export async function createAsnWithSerials(
  tenantSlug: string,
  input: {
    purchaseOrderId: string;
    productId: string;
    warehouseId: string;
    asnNumber: string;
    carrier: string;
    trackingNumber?: string;
    serialCsvText: string;
  }
): Promise<{ serialsIngested: number }> {
  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  const serials = parseSerialCsv(input.serialCsvText);
  if (serials.length === 0) throw new Error('No serial numbers found in the CSV.');

  await withTenant(tenant.id, async (client) => {
    await client.query(
      `INSERT INTO advanced_shipping_notices (purchase_order_id, asn_number, carrier, tracking_number)
       VALUES ($1,$2,$3,$4)`,
      [input.purchaseOrderId, input.asnNumber, input.carrier, input.trackingNumber ?? null]
    );

    for (const serialNumber of serials) {
      await client.query(
        `INSERT INTO serialized_stock (tenant_id, product_id, warehouse_id, serial_number, status)
         VALUES ($1,$2,$3,$4,'warehoused')
         ON CONFLICT (tenant_id, serial_number) DO NOTHING`,
        [tenant.id, input.productId, input.warehouseId, serialNumber]
      );
    }

    await client.query(`UPDATE purchase_orders SET status = 'partially_shipped' WHERE id = $1 AND tenant_id = $2`, [
      input.purchaseOrderId,
      tenant.id,
    ]);
  });

  revalidatePath(`/${tenantSlug}/vendor`);
  revalidatePath(`/${tenantSlug}/inventory`);

  return { serialsIngested: serials.length };
}
