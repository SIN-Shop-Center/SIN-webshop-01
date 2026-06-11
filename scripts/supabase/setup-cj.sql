-- Purpose: CJ Dropshipping integration schema (Step 7 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-cj.sql

-- ── CJ-Felder an products ───────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_product_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_variant_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_cost_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_cj_variant
  ON products (cj_variant_id) WHERE cj_variant_id IS NOT NULL;

-- ── CJ-Felder an orders ─────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cj_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cj_order_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending';
-- fulfillment_status lifecycle: pending → forwarded → shipped → delivered | failed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_cj_order ON orders (cj_order_id) WHERE cj_order_id IS NOT NULL;

-- ── CJ Token-Cache ──────────────────────────────────────────────────────────
-- CJ-API limitiert getAccessToken auf 1 Call / 300s.
-- Wir cachen den Token in der DB und refreshen mit 24h Puffer vor Ablauf.
CREATE TABLE IF NOT EXISTS cj_auth (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton-Row
  access_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cj_auth ENABLE ROW LEVEL SECURITY;
-- Keine Policies: Zugriff nur via Service-Role-Client.
