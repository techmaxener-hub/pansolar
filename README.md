# SolarOS Enterprise

India's all-in-one solar operating system — D2C storefront, B2B wholesaler portal,
vendor extranet, EPC CRM, multi-warehouse serialized inventory, and ERP — as a
single Next.js 15 monorepo with per-tenant white-labeling and a managed
dedicated-database upgrade path.

## Architecture

- **Shared cluster by default.** Every tenant on the `standard` / `wholesaler_pro`
  tiers lives on one PostgreSQL cluster, isolated by row-level security keyed on
  `app.current_tenant_id` (`packages/db/migrations/0001_init.sql`).
- **Managed dedicated hosting on upgrade.** `enterprise_dedicated` tenants get an
  isolated serverless Postgres instance provisioned on-demand via the Neon or
  Supabase Management API (`packages/db/src/provisioner.ts`), migrated to the
  identical schema, and registered in `managed_tenant_databases`.
- **Transparent routing.** `packages/db/src/tenant-router.ts` resolves the correct
  pool per tenant per request — application code never branches on hosting mode.
- **Distributed migrations.** `packages/db/src/migration-worker.ts` applies new
  DDL to the shared cluster and every active dedicated database concurrently.

## Getting started

```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL, TENANT_DB_ENCRYPTION_KEY, etc.

# Apply the schema to your local/shared Postgres
psql "$DATABASE_URL" -f packages/db/migrations/0001_init.sql

# Seed a demo tenant ("gujarat-solar") with warehouse + priced catalog
pnpm db:seed

# Run the app
pnpm dev
```

Visit `http://gujarat-solar.localhost:3000` (or add a hosts-file entry) to see the
seeded tenant's D2C storefront and calculator; `/gujarat-solar/crm`,
`/inventory`, `/b2b`, `/vendor`, and `/settings/subscription` for the dashboard
modules.

## Packages

| Package                    | Purpose                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| `packages/db`               | Schema, tenant connection router, provisioner, distributed migrations |
| `packages/solar-engine`     | Solar sizing calculator, parametric BOM engine, subsidy, GST, GSTIN   |
| `packages/ui`                | Glassmorphic component primitives (GlassCard, KanbanBoard, etc.)      |
| `apps/web`                   | Next.js 15 App Router — middleware tenant resolution + all modules    |
