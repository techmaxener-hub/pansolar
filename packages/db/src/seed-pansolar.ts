import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

async function main() {
  const tenantRes = await pool.query<{ id: string }>(
    `INSERT INTO tenants (name, slug, subscription_tier, subscription_status, db_mode, brand_primary_color)
     VALUES ('PanSolar', 'solar', 'wholesaler_pro', 'active', 'shared_cluster', '#10b981')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const tenantId = tenantRes.rows[0]!.id;

  const warehouseRes = await pool.query<{ id: string }>(
    `INSERT INTO warehouses (tenant_id, name, city, state, pincode, is_default)
     VALUES ($1, 'Main Warehouse', 'Ahmedabad', 'Gujarat', '380001', true)
     RETURNING id`,
    [tenantId]
  );

  const products: { sku: string; name: string; category: string; spec: object; price: number }[] = [
    { sku: 'PNL-540-MB', name: '540W Mono Bifacial Panel', category: 'panel', spec: { ratingWattsOrKw: 540 }, price: 12500 },
    { sku: 'INV-3KW-STR', name: '3kW String Inverter', category: 'inverter', spec: { ratingWattsOrKw: 3 }, price: 19500 },
    { sku: 'INV-5KW-STR', name: '5kW String Inverter', category: 'inverter', spec: { ratingWattsOrKw: 5 }, price: 32500 },
    { sku: 'ACDB-1IN1OUT', name: 'ACDB 1-in-1-out', category: 'acdb', spec: {}, price: 3200 },
    { sku: 'DCDB-STR', name: 'DCDB String Fuse Box', category: 'dcdb', spec: {}, price: 2800 },
    { sku: 'DC-CABLE-4SQMM', name: '4 sq.mm DC Cable (per meter)', category: 'dc_cable', spec: {}, price: 42 },
    { sku: 'EARTH-CHEM-ROD', name: 'Chemical Earthing Rod Set', category: 'earthing', spec: {}, price: 3800 },
    { sku: 'MOUNT-SET', name: 'GI Mounting Structure Set', category: 'mounting', spec: {}, price: 1600 },
  ];

  for (const p of products) {
    const productRes = await pool.query<{ id: string }>(
      `INSERT INTO products (tenant_id, sku, name, category, spec_json, unit_price_inr)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, sku) DO UPDATE SET unit_price_inr = EXCLUDED.unit_price_inr
       RETURNING id`,
      [tenantId, p.sku, p.name, p.category, JSON.stringify(p.spec), p.price]
    );
    const productId = productRes.rows[0]!.id;

    await pool.query(
      `INSERT INTO product_price_tiers (product_id, min_qty, max_qty, unit_price_inr, tier_label)
       VALUES
        ($1, 1, 9, $2, 'retail'),
        ($1, 10, 99, $3, 'carton'),
        ($1, 100, NULL, $4, 'pallet')`,
      [productId, p.price, Math.round(p.price * 0.92), Math.round(p.price * 0.83)]
    );
  }

  console.log(`Seeded tenant "solar" (${tenantId}), warehouse ${warehouseRes.rows[0]!.id}, ${products.length} products.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
