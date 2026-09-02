import { Pool, type PoolClient } from 'pg';
import { decryptSecret } from './crypto';

export type DbHostingMode = 'shared_cluster' | 'dedicated_instance';

interface CachedPool {
  pool: Pool;
  mode: DbHostingMode;
  lastUsedAt: number;
}

interface TenantDirectoryRow {
  db_mode: DbHostingMode;
  connection_uri_encrypted: string | null;
  subscription_status: string;
}

const IDLE_EVICTION_MS = 15 * 60 * 1000; // evict dedicated pools idle > 15 min
const EVICTION_SWEEP_MS = 5 * 60 * 1000;

const tenantPoolCache = new Map<string, CachedPool>();
let sharedDbPool: Pool | undefined;
let sweepTimer: ReturnType<typeof setInterval> | undefined;

/**
 * The one process-wide connection pool for the shared multi-tenant cluster.
 * Every tenant on the `standard` and `wholesaler_pro` tiers routes here;
 * row isolation is enforced by Postgres RLS via `app.current_tenant_id`
 * (see withTenantScope below), not by application-level filtering alone.
 */
export function getSharedPool(): Pool {
  if (!sharedDbPool) {
    sharedDbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 30,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return sharedDbPool;
}

function startEvictionSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [tenantId, cached] of tenantPoolCache) {
      if (cached.mode === 'dedicated_instance' && now - cached.lastUsedAt > IDLE_EVICTION_MS) {
        void cached.pool.end();
        tenantPoolCache.delete(tenantId);
      }
    }
  }, EVICTION_SWEEP_MS);
  sweepTimer.unref?.();
}

/**
 * Resolves and returns the correct pg Pool for a tenant — the shared
 * cluster pool for standard/wholesaler-pro tenants, or a lazily-created and
 * cached pool bound to that tenant's dedicated Neon/Supabase instance for
 * enterprise_dedicated tenants. Callers never need to know which one they
 * got; both pools speak the identical schema (see migrations/0001_init.sql).
 */
export async function getTenantDatabasePool(tenantId: string): Promise<Pool> {
  const cached = tenantPoolCache.get(tenantId);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached.pool;
  }

  const shared = getSharedPool();
  const { rows } = await shared.query<TenantDirectoryRow>(
    `SELECT t.db_mode, t.subscription_status, m.connection_uri_encrypted
       FROM tenants t
       LEFT JOIN managed_tenant_databases m ON m.tenant_id = t.id AND m.is_active = true
      WHERE t.id = $1`,
    [tenantId]
  );

  const record = rows[0];
  if (!record) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }
  if (record.subscription_status !== 'active' && record.subscription_status !== 'trialing') {
    throw new Error(`Tenant ${tenantId} subscription is ${record.subscription_status}`);
  }

  if (record.db_mode !== 'dedicated_instance' || !record.connection_uri_encrypted) {
    tenantPoolCache.set(tenantId, { pool: shared, mode: 'shared_cluster', lastUsedAt: Date.now() });
    return shared;
  }

  const connectionString = decryptSecret(record.connection_uri_encrypted);
  const dedicatedPool = new Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 45_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: true },
  });

  dedicatedPool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(`[tenant-router] dedicated pool error for tenant ${tenantId}:`, err.message);
  });

  tenantPoolCache.set(tenantId, { pool: dedicatedPool, mode: 'dedicated_instance', lastUsedAt: Date.now() });
  startEvictionSweep();
  return dedicatedPool;
}

/**
 * Runs `fn` with a client checked out from the tenant's pool, with
 * `app.current_tenant_id` set for the lifetime of the connection so
 * shared-cluster RLS policies scope every query to this tenant. On a
 * dedicated instance the SET is harmless (the RLS policy there is a no-op
 * safety net, not the isolation boundary) so callers can write one code
 * path regardless of hosting mode.
 */
export async function withTenantScope<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getTenantDatabasePool(tenantId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Invalidates a cached pool — call after a tenant's db_mode or dedicated connection string changes. */
export async function invalidateTenantPool(tenantId: string): Promise<void> {
  const cached = tenantPoolCache.get(tenantId);
  if (!cached) return;
  tenantPoolCache.delete(tenantId);
  if (cached.mode === 'dedicated_instance') {
    await cached.pool.end();
  }
}

/** Returns every distinct pool currently open — the shared pool plus one per active dedicated tenant. Used by the distributed migration worker. */
export function listActivePools(): { tenantId: string | null; pool: Pool }[] {
  const pools: { tenantId: string | null; pool: Pool }[] = [{ tenantId: null, pool: getSharedPool() }];
  for (const [tenantId, cached] of tenantPoolCache) {
    if (cached.mode === 'dedicated_instance') {
      pools.push({ tenantId, pool: cached.pool });
    }
  }
  return pools;
}
