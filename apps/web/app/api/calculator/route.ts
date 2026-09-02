import { NextResponse } from 'next/server';
import { calculateSolarSizing } from '@solaros/solar-engine';
import type { CatalogProduct } from '@solaros/solar-engine';
import { resolveTenantFromParam } from '@/lib/tenant';
import { withTenant } from '@/lib/db';

interface CalculatorRequestBody {
  tenantSlug: string;
  monthlyBillInr: number;
  discom: string;
  siteState: string;
  availableAreaSqft?: number;
  sanctionedLoadKw?: number;
}

interface ProductRow {
  category: string;
  unit_price_inr: string;
  spec_json: { ratingWattsOrKw?: number };
}

async function loadCatalogProducts(tenantId: string): Promise<CatalogProduct[]> {
  const rows = await withTenant(tenantId, async (client) => {
    const res = await client.query<ProductRow>(
      `SELECT category, unit_price_inr, spec_json FROM products WHERE tenant_id = $1
       AND category IN ('panel','inverter','acdb','dcdb','dc_cable','ac_cable','earthing','lightning_arrestor','mounting')`,
      [tenantId]
    );
    return res.rows;
  });

  return rows.map((r) => ({
    id: '',
    category: r.category as CatalogProduct['category'],
    name: r.category,
    unitPriceInr: Number(r.unit_price_inr),
    ratingWattsOrKw: r.spec_json?.ratingWattsOrKw,
  }));
}

export async function POST(request: Request) {
  const body = (await request.json()) as CalculatorRequestBody;

  if (!body.tenantSlug || !body.monthlyBillInr || !body.discom || !body.siteState) {
    return NextResponse.json(
      { error: 'tenantSlug, monthlyBillInr, discom, and siteState are required.' },
      { status: 400 }
    );
  }

  const tenant = await resolveTenantFromParam(body.tenantSlug);
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown tenant.' }, { status: 404 });
  }

  const catalogProducts = await loadCatalogProducts(tenant.id).catch(() => undefined);

  const result = calculateSolarSizing(
    {
      monthlyBillInr: body.monthlyBillInr,
      discom: body.discom,
      siteState: body.siteState,
      availableAreaSqft: body.availableAreaSqft,
      sanctionedLoadKw: body.sanctionedLoadKw,
    },
    catalogProducts
  );

  return NextResponse.json(result);
}
