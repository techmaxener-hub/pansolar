import { notFound } from 'next/navigation';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';
import { B2bClient, type B2bProduct } from './B2bClient';

interface ProductWithTiersRow {
  id: string;
  name: string;
  category: string;
  min_qty: number;
  max_qty: number | null;
  unit_price_inr: string;
  tier_label: string;
}

export default async function B2bPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantParam } = await params;
  const tenant = await resolveTenantFromParam(tenantParam);
  if (!tenant) notFound();

  const rows = await withTenant(tenant.id, async (client) => {
    const res = await client.query<ProductWithTiersRow>(
      `SELECT p.id, p.name, p.category, t.min_qty, t.max_qty, t.unit_price_inr, t.tier_label
         FROM products p
         JOIN product_price_tiers t ON t.product_id = p.id
        WHERE p.tenant_id = $1
        ORDER BY p.name, t.min_qty`,
      [tenant.id]
    );
    return res.rows;
  });

  const productMap = new Map<string, B2bProduct>();
  for (const row of rows) {
    if (!productMap.has(row.id)) {
      productMap.set(row.id, { id: row.id, name: row.name, category: row.category, tiers: [] });
    }
    productMap.get(row.id)!.tiers.push({
      minQty: row.min_qty,
      maxQty: row.max_qty,
      unitPriceInr: Number(row.unit_price_inr),
      tierLabel: row.tier_label,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-100">B2B Wholesaler Portal</h1>
      <B2bClient products={[...productMap.values()]} />
    </div>
  );
}
