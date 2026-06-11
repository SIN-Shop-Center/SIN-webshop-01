-- Purpose: Cart tables for the Next.js storefront (Step 3 of migration)
-- Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
--
-- Run against the Supabase project:
--   psql "$DATABASE_URL" -f scripts/supabase/setup-cart.sql

-- ── Cart items ───────────────────────────────────────────────────────────────
-- Guest + user carts, scoped by an httpOnly cookie (cart_id).
-- RLS deny-all: Zugriff ausschließlich über Service-Role-Client in Server
-- Actions. Das cart_id-Cookie sieht Browser-JS nie.
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items (cart_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
-- Keine Policies = anon/authenticated haben keinerlei Zugriff.
