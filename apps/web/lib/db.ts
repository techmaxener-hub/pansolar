import { withTenantScope } from '@solaros/db';
import type { PoolClient } from 'pg';

/**
 * Every tenant-scoped data access in the app goes through this — it checks
 * out a client from the correct pool (shared cluster or the tenant's
 * dedicated instance, see @solaros/db's tenant-router) and sets
 * app.current_tenant_id for RLS before `fn` runs.
 */
export function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTenantScope(tenantId, fn);
}
