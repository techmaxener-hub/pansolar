import { cache } from 'react';
import { getSharedPool } from '@solaros/db';

const CUSTOM_DOMAIN_MARKER = '~domain~';

export interface TenantBranding {
  id: string;
  slug: string;
  name: string;
  customDomain: string | null;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandFontFamily: string | null;
  subscriptionTier: 'standard' | 'wholesaler_pro' | 'enterprise_dedicated';
  subscriptionStatus: string;
  dbMode: 'shared_cluster' | 'dedicated_instance';
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_font_family: string | null;
  subscription_tier: TenantBranding['subscriptionTier'];
  subscription_status: string;
  db_mode: TenantBranding['dbMode'];
}

function mapRow(row: TenantRow): TenantBranding {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    customDomain: row.custom_domain,
    logoUrl: row.logo_url,
    brandPrimaryColor: row.brand_primary_color,
    brandFontFamily: row.brand_font_family,
    subscriptionTier: row.subscription_tier,
    subscriptionStatus: row.subscription_status,
    dbMode: row.db_mode,
  };
}

/**
 * Resolves the `[tenant]` route param — either a plain slug (subdomain
 * routing) or a `~domain~<host>` marker (custom CNAME, see middleware.ts)
 * — into the tenant's branding + subscription record. Cached per request
 * with React's `cache()` since every server component under app/[tenant]
 * calls this independently.
 */
export const resolveTenantFromParam = cache(async (tenantParam: string): Promise<TenantBranding | null> => {
  const pool = getSharedPool();

  const { rows } = tenantParam.startsWith(CUSTOM_DOMAIN_MARKER)
    ? await pool.query<TenantRow>(`SELECT * FROM tenants WHERE custom_domain = $1`, [
        tenantParam.slice(CUSTOM_DOMAIN_MARKER.length),
      ])
    : await pool.query<TenantRow>(`SELECT * FROM tenants WHERE slug = $1`, [tenantParam]);

  const row = rows[0];
  return row ? mapRow(row) : null;
});
