-- SolarOS Enterprise — initial schema.
-- Applied to the shared cluster AND, verbatim, to every dedicated tenant
-- database by the distributed migration worker (src/migration-worker.ts).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE db_hosting_mode AS ENUM ('shared_cluster', 'dedicated_instance');
CREATE TYPE subscription_tier AS ENUM ('standard', 'wholesaler_pro', 'enterprise_dedicated');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE epc_stage AS ENUM (
    'lead', 'shading_survey', 'bom_approval', 'net_meter_sanction',
    'material_dispatch', 'erection_wiring', 'testing_commissioning', 'subsidy_disbursal'
);
CREATE TYPE asset_status AS ENUM ('warehoused', 'allocated', 'dispatched', 'installed', 'rma');
CREATE TYPE po_status AS ENUM ('draft', 'submitted', 'acknowledged', 'partially_shipped', 'fulfilled', 'cancelled');

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    brand_primary_color VARCHAR(16),
    brand_font_family VARCHAR(128),
    subscription_tier subscription_tier NOT NULL DEFAULT 'standard',
    subscription_status subscription_status NOT NULL DEFAULT 'trialing',
    db_mode db_hosting_mode NOT NULL DEFAULT 'shared_cluster',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE managed_tenant_databases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(64) DEFAULT 'neon_serverless',
    instance_id VARCHAR(128) NOT NULL,
    connection_uri_encrypted TEXT NOT NULL,
    region VARCHAR(64) DEFAULT 'ap-south-1',
    storage_allocated_mb INT DEFAULT 5120,
    is_active BOOLEAN DEFAULT TRUE,
    last_migration_version VARCHAR(64) DEFAULT 'v1.0.0',
    provisioned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tenant_managed_db ON managed_tenant_databases(tenant_id);

CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    pincode VARCHAR(16) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_warehouses_tenant ON warehouses(tenant_id);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    spec_json JSONB NOT NULL DEFAULT '{}',
    unit_price_inr NUMERIC(12,2) NOT NULL,
    gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category);

CREATE TABLE product_price_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_qty INT NOT NULL,
    max_qty INT,
    unit_price_inr NUMERIC(12,2) NOT NULL,
    tier_label VARCHAR(32) NOT NULL
);
CREATE INDEX idx_price_tiers_product_qty ON product_price_tiers(product_id, min_qty);

CREATE TABLE solar_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    site_address TEXT NOT NULL,
    site_state VARCHAR(128) NOT NULL,
    discom VARCHAR(128) NOT NULL,
    monthly_bill_inr NUMERIC(10,2) NOT NULL,
    sanctioned_load_kw NUMERIC(6,2),
    system_size_kw NUMERIC(6,2) NOT NULL,
    required_area_sqft NUMERIC(8,2) NOT NULL,
    estimated_cost_inr NUMERIC(12,2) NOT NULL,
    subsidy_amount_inr NUMERIC(12,2) NOT NULL,
    net_cost_inr NUMERIC(12,2) NOT NULL,
    stage epc_stage NOT NULL DEFAULT 'lead',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_tenant_stage ON solar_projects(tenant_id, stage);

CREATE TABLE project_bom_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES solar_projects(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    category VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    unit_price_inr NUMERIC(12,2) NOT NULL,
    line_total_inr NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_bom_lines_project ON project_bom_lines(project_id);

CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES solar_projects(id) ON DELETE CASCADE,
    stage epc_stage NOT NULL,
    photo_url TEXT,
    note TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_milestones_project ON project_milestones(project_id);

CREATE TABLE serialized_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    serial_number VARCHAR(255) NOT NULL,
    status asset_status NOT NULL DEFAULT 'warehoused',
    project_id UUID REFERENCES solar_projects(id),
    inwarded_at TIMESTAMPTZ DEFAULT NOW(),
    warranty_start TIMESTAMPTZ,
    warranty_end TIMESTAMPTZ,
    UNIQUE(tenant_id, serial_number)
);
CREATE INDEX idx_serialized_stock_tenant_status ON serialized_stock(tenant_id, status);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_gstin VARCHAR(16) NOT NULL,
    po_number VARCHAR(64) NOT NULL,
    status po_status NOT NULL DEFAULT 'draft',
    total_value_inr NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, po_number)
);
CREATE INDEX idx_po_tenant_status ON purchase_orders(tenant_id, status);

CREATE TABLE advanced_shipping_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    asn_number VARCHAR(64) NOT NULL,
    carrier VARCHAR(128) NOT NULL,
    tracking_number VARCHAR(128),
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    serial_csv_url TEXT
);
CREATE INDEX idx_asn_po ON advanced_shipping_notices(purchase_order_id);

-- Row Level Security: every tenant-scoped table on the SHARED cluster is
-- isolated by app.current_tenant_id, set per-request by the connection
-- router before any query runs (see src/tenant-router.ts::withTenantScope).
-- Dedicated tenant databases hold exactly one tenant's rows, so RLS there
-- is a harmless no-op safety net rather than the primary isolation layer.

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE serialized_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenant_users
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON warehouses
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON products
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON solar_projects
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON serialized_stock
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation ON purchase_orders
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
