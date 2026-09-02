'use server';

import { revalidatePath } from 'next/cache';
import { resolveTenantFromParam } from '@/lib/tenant';
import { getSharedPool } from '@solaros/db';

const VALID_TIERS = ['standard', 'wholesaler_pro', 'enterprise_dedicated'] as const;

export async function setSubscriptionTier(tenantSlug: string, tier: string): Promise<void> {
  if (!VALID_TIERS.includes(tier as (typeof VALID_TIERS)[number])) {
    throw new Error(`Invalid subscription tier: ${tier}`);
  }

  const tenant = await resolveTenantFromParam(tenantSlug);
  if (!tenant) throw new Error('Unknown tenant.');

  await getSharedPool().query(`UPDATE tenants SET subscription_tier = $1, updated_at = NOW() WHERE id = $2`, [
    tier,
    tenant.id,
  ]);

  revalidatePath(`/${tenantSlug}/settings/subscription`);
}
