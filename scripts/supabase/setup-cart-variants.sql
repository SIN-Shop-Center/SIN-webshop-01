-- Purpose: CJ variant support in cart + default variant on products
-- Docs: AGENTS.md
-- Run: psql "$DATABASE_URL" -f scripts/supabase/setup-cart-variants.sql

ALTER TABLE shop.cart_items ADD COLUMN IF NOT EXISTS cj_variant_id text;
ALTER TABLE shop.cart_items ADD COLUMN IF NOT EXISTS variant_name text;

ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS default_cj_variant_id text;
