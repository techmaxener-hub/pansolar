import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { encryptSecret } from './crypto';
import { getSharedPool, invalidateTenantPool } from './tenant-router';

export type DedicatedDbProvider = 'neon_serverless' | 'supabase_isolated';

export interface ProvisionResult {
  provider: DedicatedDbProvider;
  instanceId: string;
  connectionUri: string;
  region: string;
}

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

function loadMigrationStatements(): string[] {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
}

async function provisionOnNeon(tenantSlug: string, region: string): Promise<ProvisionResult> {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) throw new Error('NEON_API_KEY is not configured');

  const createRes = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name: `solaros-tenant-${tenantSlug}`,
        region_id: region === 'ap-south-1' ? 'aws-ap-southeast-1' : region,
        pg_version: 16,
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Neon project creation failed: ${createRes.status} ${await createRes.text()}`);
  }

  const body = (await createRes.json()) as {
    project: { id: string; region_id: string };
    connection_uris: { connection_uri: string }[];
  };

  const connectionUri = body.connection_uris[0]?.connection_uri;
  if (!connectionUri) {
    throw new Error('Neon API did not return a connection URI');
  }

  return {
    provider: 'neon_serverless',
    instanceId: body.project.id,
    connectionUri,
    region,
  };
}

async function provisionOnSupabase(tenantSlug: string, region: string): Promise<ProvisionResult> {
  const apiKey = process.env.SUPABASE_MANAGEMENT_API_KEY;
  const orgId = process.env.SUPABASE_ORG_ID;
  if (!apiKey || !orgId) {
    throw new Error('SUPABASE_MANAGEMENT_API_KEY / SUPABASE_ORG_ID is not configured');
  }

  const dbPassword = randomUUID().replace(/-/g, '');

  const createRes = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organization_id: orgId,
      name: `solaros-tenant-${tenantSlug}`,
      db_pass: dbPassword,
      region: region === 'ap-south-1' ? 'ap-south-1' : region,
      plan: 'free',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Supabase project creation failed: ${createRes.status} ${await createRes.text()}`);
  }

  const project = (await createRes.json()) as { id: string; ref: string };

  await waitForSupabaseProjectActive(apiKey, project.ref);

  const connectionUri = `postgresql://postgres:${dbPassword}@db.${project.ref}.supabase.co:5432/postgres?sslmode=require`;

  return {
    provider: 'supabase_isolated',
    instanceId: project.ref,
    connectionUri,
    region,
  };
}

async function waitForSupabaseProjectActive(apiKey: string, ref: string, maxAttempts = 30): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { status: string };
      if (data.status === 'ACTIVE_HEALTHY') return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Supabase project ${ref} did not become active in time`);
}

async function applyMigrationsToDedicatedInstance(connectionUri: string): Promise<void> {
  const pool = new Pool({ connectionString: connectionUri, max: 3, ssl: { rejectUnauthorized: true } });
  try {
    for (const statements of loadMigrationStatements()) {
      await pool.query(statements);
    }
  } finally {
    await pool.end();
  }
}

/**
 * Provisions an isolated dedicated database for a tenant upgrading to the
 * Enterprise Dedicated plan: creates the instance via the configured
 * provider, runs every migration against it, encrypts and persists the
 * connection string, and flips tenants.db_mode so the connection router
 * (getTenantDatabasePool) starts routing that tenant's traffic there.
 */
export async function provisionDedicatedDatabase(
  tenantId: string,
  tenantSlug: string,
  provider: DedicatedDbProvider = (process.env.DEDICATED_DB_PROVIDER as DedicatedDbProvider) || 'neon_serverless',
  region = 'ap-south-1'
): Promise<ProvisionResult> {
  const shared = getSharedPool();

  const existing = await shared.query(
    `SELECT id FROM managed_tenant_databases WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Tenant ${tenantId} already has an active dedicated database`);
  }

  const result =
    provider === 'neon_serverless'
      ? await provisionOnNeon(tenantSlug, region)
      : await provisionOnSupabase(tenantSlug, region);

  await applyMigrationsToDedicatedInstance(result.connectionUri);

  const encrypted = encryptSecret(result.connectionUri);

  await shared.query('BEGIN');
  try {
    await shared.query(
      `INSERT INTO managed_tenant_databases
         (tenant_id, provider, instance_id, connection_uri_encrypted, region, is_active, last_migration_version)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT (tenant_id) DO UPDATE SET
         provider = EXCLUDED.provider,
         instance_id = EXCLUDED.instance_id,
         connection_uri_encrypted = EXCLUDED.connection_uri_encrypted,
         region = EXCLUDED.region,
         is_active = true,
         updated_at = NOW()`,
      [tenantId, result.provider, result.instanceId, encrypted, result.region, latestMigrationVersion()]
    );
    await shared.query(`UPDATE tenants SET db_mode = 'dedicated_instance', updated_at = NOW() WHERE id = $1`, [
      tenantId,
    ]);
    await shared.query('COMMIT');
  } catch (err) {
    await shared.query('ROLLBACK');
    throw err;
  }

  await invalidateTenantPool(tenantId);

  return result;
}

function latestMigrationVersion(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  return files[files.length - 1]?.replace('.sql', '') ?? 'v1.0.0';
}
