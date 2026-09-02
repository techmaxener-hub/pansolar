import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { GlassBadge, GlassTable } from '@solaros/ui';
import { InwardForm } from './InwardForm';

interface StockRow {
  id: string;
  serial_number: string;
  status: string;
  product_name: string;
  warehouse_name: string | null;
  inwarded_at: string;
}

export default async function InventoryPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const { stock, products, warehouses } = await withTenant(tenant.id, async (client) => {
    const stockRes = await client.query<StockRow>(
      `SELECT s.id, s.serial_number, s.status, p.name AS product_name, w.name AS warehouse_name, s.inwarded_at
         FROM serialized_stock s
         JOIN products p ON p.id = s.product_id
         LEFT JOIN warehouses w ON w.id = s.warehouse_id
        WHERE s.tenant_id = $1
        ORDER BY s.inwarded_at DESC
        LIMIT 200`,
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
    return { stock: stockRes.rows, products: productsRes.rows, warehouses: warehousesRes.rows };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-100">Multi-Warehouse Serialized Inventory</h1>

      <InwardForm
        tenantSlug={tenantParam}
        products={products.map((p) => ({ id: p.id, label: p.name }))}
        warehouses={warehouses.map((w) => ({ id: w.id, label: w.name }))}
      />

      <GlassTable
        rowKey={(r) => r.id}
        columns={[
          { key: 'serial', header: 'Serial / Barcode', render: (r) => r.serial_number },
          { key: 'product', header: 'Product', render: (r) => r.product_name },
          { key: 'warehouse', header: 'Warehouse', render: (r) => r.warehouse_name ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <GlassBadge tone={r.status === 'installed' ? 'emerald' : r.status === 'rma' ? 'amber' : 'neutral'}>
                {r.status}
              </GlassBadge>
            ),
          },
        ]}
        rows={stock}
        emptyMessage="No serialized stock inwarded yet."
      />
    </div>
  );
}
