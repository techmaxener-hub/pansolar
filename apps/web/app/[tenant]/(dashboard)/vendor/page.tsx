import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { VendorClient, type PoRow, type Option } from './VendorClient';

interface PoQueryRow {
  id: string;
  po_number: string;
  vendor_name: string;
  status: string;
  total_value_inr: string;
}

export default async function VendorPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const { purchaseOrders, products, warehouses } = await withTenant(tenant.id, async (client) => {
    const poRes = await client.query<PoQueryRow>(
      `SELECT id, po_number, vendor_name, status, total_value_inr
         FROM purchase_orders WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenant.id]
    );
    const productsRes = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM products WHERE tenant_id = $1 ORDER BY name`,
      [tenant.id]
    );
    const warehousesRes = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM warehouses WHERE tenant_id = $1 ORDER BY name`,
      [tenant.id]
    );
    return { purchaseOrders: poRes.rows, products: productsRes.rows, warehouses: warehousesRes.rows };
  });

  const poRows: PoRow[] = purchaseOrders.map((r) => ({
    id: r.id,
    poNumber: r.po_number,
    vendorName: r.vendor_name,
    status: r.status,
    totalValueInr: Number(r.total_value_inr),
  }));
  const productOptions: Option[] = products.map((p) => ({ id: p.id, label: p.name }));
  const warehouseOptions: Option[] = warehouses.map((w) => ({ id: w.id, label: w.name }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-100">Vendor Extranet</h1>
      <VendorClient tenantSlug={tenantParam} purchaseOrders={poRows} products={productOptions} warehouses={warehouseOptions} />
    </div>
  );
}
