-- Purpose: Pre-Order/Backorder-Unterstützung (Issue #53)
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-preorder.sql

BEGIN;

ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restock_eta DATE;

COMMIT;
