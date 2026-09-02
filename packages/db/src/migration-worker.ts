import { Pool } from 'pg';
import { decryptSecret } from './crypto';
import { getSharedPool } from './tenant-router';

interface DedicatedTarget {
  tenantId: string;
  connectionUri: string;
  instanceId: string;
}

interface MigrationOutcome {
  target: 'shared_cluster' | string; // tenant_id for dedicated targets
  success: boolean;
  error?: string;
}

const WORKER_CONCURRENCY = 5;

async function loadDedicatedTargets(): Promise<DedicatedTarget[]> {
  const shared = getSharedPool();
  const { rows } = await shared.query<{ tenant_id: string; connection_uri_encrypted: string; instance_id: string }>(
    `SELECT tenant_id, connection_uri_encrypted, instance_id
       FROM managed_tenant_databases
      WHERE is_active = true`
  );
  return rows.map((r) => ({
    tenantId: r.tenant_id,
    connectionUri: decryptSecret(r.connection_uri_encrypted),
    instanceId: r.instance_id,
  }));
}

async function runOnPool(pool: Pool, sql: string): Promise<void> {
  await pool.query(sql);
}

async function withConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Applies one DDL migration's SQL to the shared cluster AND every active
 * dedicated tenant database concurrently, bounded by WORKER_CONCURRENCY.
 * Called from CI/CD after a new file lands in packages/db/migrations —
 * distributed so tenants on Enterprise Dedicated stay schema-identical to
 * the shared cluster without a separate deploy per tenant.
 */
export async function applyDistributedMigration(
  migrationVersion: string,
  sql: string
): Promise<{ outcomes: MigrationOutcome[]; failureCount: number }> {
  const outcomes: MigrationOutcome[] = [];

  try {
    await runOnPool(getSharedPool(), sql);
    outcomes.push({ target: 'shared_cluster', success: true });
  } catch (err) {
    outcomes.push({ target: 'shared_cluster', success: false, error: (err as Error).message });
  }

  const dedicatedTargets = await loadDedicatedTargets();

  const dedicatedOutcomes = await withConcurrency(dedicatedTargets, WORKER_CONCURRENCY, async (target) => {
    const pool = new Pool({ connectionString: target.connectionUri, max: 2, ssl: { rejectUnauthorized: true } });
    try {
      await runOnPool(pool, sql);
      await getSharedPool().query(
        `UPDATE managed_tenant_databases SET last_migration_version = $1, updated_at = NOW() WHERE tenant_id = $2`,
        [migrationVersion, target.tenantId]
      );
      return { target: target.tenantId, success: true } satisfies MigrationOutcome;
    } catch (err) {
      return { target: target.tenantId, success: false, error: (err as Error).message } satisfies MigrationOutcome;
    } finally {
      await pool.end();
    }
  });

  outcomes.push(...dedicatedOutcomes);

  const failureCount = outcomes.filter((o) => !o.success).length;
  return { outcomes, failureCount };
}
