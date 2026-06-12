-- Purpose: Fulfillment columns for order retry + error tracking
-- Docs: AGENTS.md
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-fulfillment.sql

ALTER TABLE shop.orders ADD COLUMN IF NOT EXISTS fulfillment_error text;
ALTER TABLE shop.orders ADD COLUMN IF NOT EXISTS fulfillment_attempts int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_retry
  ON shop.orders (fulfillment_status, fulfillment_attempts)
  WHERE fulfillment_status IN ('pending', 'failed');
